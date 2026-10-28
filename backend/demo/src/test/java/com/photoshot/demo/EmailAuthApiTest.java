package com.photoshot.demo;

import com.photoshot.demo.mail.LoggingMailSender;
import com.photoshot.demo.mail.MailSender;
import com.photoshot.demo.support.ApiTestBase;
import com.photoshot.demo.user.dao.EmailCodeDao;
import com.photoshot.demo.user.service.EmailCodeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 邮箱登录链路集成测试：真实 HTTP + 真实 H2 表 + log 通道（不联网）。
 *
 * 重点不是「接口返回 0」，而是：
 *  - 验证码确实交给了 MailSender（不是只写了数据库）；
 *  - 发送失败必须回滚记录，不能白占频控额度；
 *  - 邮箱账号与手机号账号走同一套协议/额度/令牌逻辑。
 */
class EmailAuthApiTest extends ApiTestBase {

    @Autowired
    private MailSender mailSender;

    @Autowired
    private EmailCodeDao emailCodeDao;

    private String newEmail() {
        return "it" + System.nanoTime() + "@example.com";
    }

    private Map<String, Object> loginBody(String email, String code) {
        return Map.of(
                "email", email,
                "code", code,
                "deviceId", "it-device-email",
                "registerSource", "H5",
                "agreements", allAgreements());
    }

    @Test
    void code_is_handed_to_mail_sender_and_login_auto_registers() {
        String email = newEmail();
        ApiResponse send = post("/api/user/auth/email/code", null, Map.of("email", email));

        assertThat(send.code()).isZero();
        assertThat(send.data().path("devCode").asText()).isEqualTo(TEST_SMS_CODE);
        assertThat(send.data().path("expireSeconds").asInt()).isEqualTo(600);

        // 关键断言：验证码真的交给了发送通道，而不是只落库
        LoggingMailSender logSender = (LoggingMailSender) mailSender;
        assertThat(logSender.lastTo()).isEqualTo(email);
        assertThat(logSender.lastCode()).isEqualTo(TEST_SMS_CODE);

        ApiResponse login = post("/api/user/auth/email/login", null, loginBody(email, TEST_SMS_CODE));
        assertThat(login.code()).isZero();
        assertThat(login.data().path("newUser").asBoolean()).isTrue();
        assertThat(login.data().path("user").path("emailMasked").asText())
                .isEqualTo(email.charAt(0) + "***@example.com");
        // 全局 non_null 策略下，手机号字段直接不出现（不是 null），用 hasNonNull 判定更稳
        assertThat(login.data().path("user").hasNonNull("phoneMasked")).isFalse();
        assertThat(login.data().path("quota").path("balance").asInt()).isEqualTo(5);

        String token = login.data().path("token").asText();
        ApiResponse me = get("/api/user/auth/me", token);
        assertThat(me.code()).isZero();
        assertThat(me.data().path("emailMasked").asText())
                .isEqualTo(email.charAt(0) + "***@example.com");
    }

    @Test
    void same_email_second_login_reuses_account_and_does_not_regrant_quota() {
        String email = newEmail();
        post("/api/user/auth/email/code", null, Map.of("email", email));
        ApiResponse first = post("/api/user/auth/email/login", null, loginBody(email, TEST_SMS_CODE));
        assertThat(first.code()).isZero();

        // 绕过 60 秒频控：直接写一条 61 秒前的记录（与短信测试同一手法）
        issueEmailCodeDirectly(email);

        ApiResponse second = post("/api/user/auth/email/login", null, loginBody(email, TEST_SMS_CODE));
        assertThat(second.code()).isZero();
        assertThat(second.data().path("newUser").asBoolean()).isFalse();
        assertThat(second.data().path("user").path("id").asLong())
                .isEqualTo(first.data().path("user").path("id").asLong());
        assertThat(second.data().path("quota").path("balance").asInt()).isEqualTo(5);
    }

    @Test
    void resend_within_60_seconds_is_blocked() {
        String email = newEmail();
        assertThat(post("/api/user/auth/email/code", null, Map.of("email", email)).code()).isZero();
        ApiResponse again = post("/api/user/auth/email/code", null, Map.of("email", email));
        assertThat(again.code()).isEqualTo(20021);
    }

    @Test
    void wrong_code_and_invalid_email_are_rejected() {
        String email = newEmail();
        post("/api/user/auth/email/code", null, Map.of("email", email));

        assertThat(post("/api/user/auth/email/login", null, loginBody(email, "123456")).code())
                .isEqualTo(20023);
        assertThat(post("/api/user/auth/email/code", null, Map.of("email", "not-an-email")).code())
                .isEqualTo(20020);
    }

    @Test
    void code_is_single_use() {
        String email = newEmail();
        post("/api/user/auth/email/code", null, Map.of("email", email));
        assertThat(post("/api/user/auth/email/login", null, loginBody(email, TEST_SMS_CODE)).code()).isZero();
        assertThat(post("/api/user/auth/email/login", null, loginBody(email, TEST_SMS_CODE)).code())
                .isEqualTo(20023);
    }

    @Test
    void send_failure_rolls_back_code_so_quota_is_not_wasted() {
        String email = newEmail();
        LoggingMailSender logSender = (LoggingMailSender) mailSender;
        logSender.failNext();

        ApiResponse failed = post("/api/user/auth/email/code", null, Map.of("email", email));
        assertThat(failed.code()).isEqualTo(20025);

        // 记录已回滚：表里没有这个邮箱的行
        assertThat(emailCodeDao.countSince(
                emailHashOf(email), EmailCodeService.SCENE_LOGIN, LocalDateTime.now().minusDays(1)))
                .isZero();

        // 因此可以立刻重发，不会被 60 秒频控误伤
        assertThat(post("/api/user/auth/email/code", null, Map.of("email", email)).code()).isZero();
    }

    private void issueEmailCodeDirectly(String email) {
        LocalDateTime now = LocalDateTime.now();
        emailCodeDao.insert(
                emailHashOf(email),
                EmailCodeService.SCENE_LOGIN,
                sha256Of(email),
                now.plusMinutes(10),
                "it-test",
                now.minusSeconds(61));
    }

    /** 复用服务的同一套哈希规则，避免测试自己造一套导致「测的不是线上逻辑」 */
    private String emailHashOf(String email) {
        return emailCodec.hash(email);
    }

    private String sha256Of(String email) {
        return emailCodec.sha256(EmailCodeService.SCENE_LOGIN + "|" + email + "|" + TEST_SMS_CODE);
    }
}
