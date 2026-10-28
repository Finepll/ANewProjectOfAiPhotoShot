package com.photoshot.demo;

import com.photoshot.demo.support.ApiTestBase;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * C 端账号链路集成测试：验证码 → 登录/自动注册 → 协议存证 → 隐私开关 → 额度流水。
 * 每个用例使用独立手机号，避免频控与数据互相影响。
 */
class UserAuthApiTest extends ApiTestBase {

    @Test
    void health_is_public_and_reports_database_up() {
        ApiResponse response = get("/api/health", null);

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.code()).isZero();
        assertThat(response.data().path("database").asText()).isEqualTo("up");
        assertThat(response.data().path("smsDevMode").asBoolean()).isTrue();
    }

    @Test
    void me_without_token_returns_401_and_business_code_20001() {
        ApiResponse response = get("/api/user/auth/me", null);

        assertThat(response.status()).isEqualTo(401);
        assertThat(response.code()).isEqualTo(20001);
        assertThat(response.message()).isNotBlank();
    }

    @Test
    void send_code_rejects_invalid_phone() {
        ApiResponse response = post("/api/user/auth/code", null, Map.of("phone", "12345"));

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.code()).isEqualTo(10001);
        assertThat(response.message()).contains("11 位手机号");
    }

    @Test
    void send_code_returns_dev_code_and_blocks_resend_within_60_seconds() {
        String phone = newPhone();

        ApiResponse first = post("/api/user/auth/code", null, Map.of("phone", phone));
        assertThat(first.code()).isZero();
        assertThat(first.data().path("devCode").asText()).isEqualTo(TEST_SMS_CODE);
        assertThat(first.data().path("expireSeconds").asInt()).isEqualTo(300);
        assertThat(first.data().path("resendAfterSeconds").asInt()).isEqualTo(60);

        ApiResponse second = post("/api/user/auth/code", null, Map.of("phone", phone));
        assertThat(second.code()).isEqualTo(20011);
        assertThat(second.message()).contains("60 秒内不重复下发");
    }

    @Test
    void login_with_wrong_code_returns_20013() {
        String phone = newPhone();
        post("/api/user/auth/code", null, Map.of("phone", phone));

        Map<String, Object> body = new LinkedHashMap<>(loginBody(phone));
        body.put("code", "111111");

        ApiResponse response = post("/api/user/auth/login", null, body);
        assertThat(response.code()).isEqualTo(20013);
        assertThat(response.message()).contains("验证码不正确");
    }

    @Test
    void first_login_registers_user_grants_quota_and_signs_three_agreements() {
        String phone = newPhone();
        ApiResponse login = loginNewUser(phone);

        assertThat(login.code()).isZero();
        assertThat(login.data().path("newUser").asBoolean()).isTrue();
        assertThat(login.data().path("quota").path("balance").asInt()).isEqualTo(5);
        assertThat(login.data().path("quota").path("registerGift").asInt()).isEqualTo(5);
        assertThat(login.data().path("needAgreement").asBoolean()).isFalse();
        assertThat(login.data().path("signedAgreements").size()).isEqualTo(3);
        assertThat(login.data().path("expiresInSeconds").asLong()).isEqualTo(7 * 24 * 3600);

        String token = login.data().path("token").asText();
        assertThat(token).isNotBlank();

        ApiResponse me = get("/api/user/auth/me", token);
        assertThat(me.code()).isZero();
        assertThat(me.data().path("phoneMasked").asText())
                .isEqualTo("139****" + phone.substring(phone.length() - 4));
        assertThat(me.data().path("quotaBalance").asInt()).isEqualTo(5);
        assertThat(me.data().path("privacy").path("localMode").asInt()).isEqualTo(1);
        assertThat(me.data().path("privacy").path("cloudAllowed").asInt()).isZero();
        assertThat(me.data().path("privacy").path("faceFeatureSaved").asInt()).isZero();

        JsonNode consents = me.data().path("consents");
        assertThat(consents.size()).isEqualTo(3);
        for (JsonNode consent : consents) {
            assertThat(consent.path("effective").asBoolean()).isTrue();
            assertThat(consent.path("version").asText()).isEqualTo("V3.4");
            assertThat(consent.path("signHash").asText()).hasSize(64);
        }
    }

    @Test
    void register_gift_is_granted_only_once_across_logins() {
        String phone = newPhone();
        ApiResponse first = loginNewUser(phone);
        String token = first.data().path("token").asText();
        long userId = first.data().path("user").path("id").asLong();

        // 绕过 60 秒频控：等价于 61 秒后重新获取验证码
        issueCodeDirectly(phone);
        ApiResponse second = post("/api/user/auth/login", null, loginBody(phone));

        assertThat(second.code()).isZero();
        assertThat(second.data().path("newUser").asBoolean()).isFalse();
        assertThat(second.data().path("quota").path("balance").asInt()).isEqualTo(5);

        JsonNode flows = get("/api/user/auth/quota/flows", token).data();
        long giftCount = 0;
        for (JsonNode flow : flows) {
            if (("GIFT-REGISTER-" + userId).equals(flow.path("bizNo").asText())) {
                giftCount++;
            }
        }
        assertThat(giftCount).isEqualTo(1);
        assertThat(flows.size()).isGreaterThanOrEqualTo(1);
        assertThat(flows.get(0).path("delta").asInt()).isEqualTo(5);
        assertThat(flows.get(0).path("balanceAfter").asInt()).isEqualTo(5);
    }

    @Test
    void portrait_agreement_can_be_revoked_and_resigned() {
        String token = loginAndGetToken(newPhone());

        JsonNode before = findConsent(get("/api/user/auth/agreement/list", token).data(), "PORTRAIT");
        assertThat(before).isNotNull();
        assertThat(before.path("effective").asBoolean()).isTrue();
        String oldHash = before.path("signHash").asText();

        ApiResponse revoked = post("/api/user/auth/agreement/revoke", token,
                Map.of("code", "PORTRAIT", "version", "V3.4", "reason", "集成测试撤回"));
        assertThat(revoked.code()).isZero();
        assertThat(findConsent(revoked.data().path("consents"), "PORTRAIT").path("effective").asBoolean())
                .isFalse();

        ApiResponse resigned = post("/api/user/auth/agreement", token,
                Map.of("code", "PORTRAIT", "version", "V3.4", "deviceId", "it-device-001"));
        assertThat(resigned.code()).isZero();
        JsonNode after = findConsent(resigned.data().path("consents"), "PORTRAIT");
        assertThat(after.path("effective").asBoolean()).isTrue();
        assertThat(after.path("signHash").asText()).isNotEqualTo(oldHash);
    }

    @Test
    void privacy_switch_can_be_updated_and_range_is_validated() {
        String token = loginAndGetToken(newPhone());

        ApiResponse updated = put("/api/user/auth/privacy", token,
                Map.of("autoCleanDays", 3, "cloudAllowed", 1));
        assertThat(updated.code()).isZero();
        assertThat(updated.data().path("privacy").path("autoCleanDays").asInt()).isEqualTo(3);
        assertThat(updated.data().path("privacy").path("cloudAllowed").asInt()).isEqualTo(1);

        ApiResponse invalid = put("/api/user/auth/privacy", token, Map.of("autoCleanDays", 400));
        assertThat(invalid.code()).isEqualTo(10001);
        assertThat(invalid.message()).contains("0~365");
    }

    @Test
    void user_token_cannot_access_admin_api() {
        String token = loginAndGetToken(newPhone());

        ApiResponse response = get("/api/admin/admins", token);

        assertThat(response.status()).isEqualTo(401);
        assertThat(response.code()).isEqualTo(20003);
        assertThat(response.message()).contains("管理员");
    }

    @Test
    void logout_requires_login_and_returns_ok() {
        String token = loginAndGetToken(newPhone());
        assertThat(post("/api/user/auth/logout", token, null).code()).isZero();

        ApiResponse anonymous = post("/api/user/auth/logout", null, null);
        assertThat(anonymous.status()).isEqualTo(401);
        assertThat(anonymous.code()).isEqualTo(20001);
    }
}
