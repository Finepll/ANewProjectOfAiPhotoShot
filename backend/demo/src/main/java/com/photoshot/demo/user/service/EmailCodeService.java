package com.photoshot.demo.user.service;

import com.photoshot.demo.common.BizException;
import com.photoshot.demo.common.ErrorCodes;
import com.photoshot.demo.config.AppProperties;
import com.photoshot.demo.mail.MailSendException;
import com.photoshot.demo.mail.MailSender;
import com.photoshot.demo.user.dao.EmailCodeDao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 邮箱验证码服务（F-ACC-01 的邮箱通道）。
 *
 * 规则：10 分钟有效、同邮箱 60 秒内不重复下发、单日 10 条上限、一次性消费、只存哈希。
 * 【合规】邮箱明文只在本次请求内使用，发送完即丢；日志只打印脱敏地址。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailCodeService {

    public static final String SCENE_LOGIN = "LOGIN";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailCodeDao emailCodeDao;
    private final EmailCodec emailCodec;
    private final MailSender mailSender;
    private final AppProperties properties;

    /** devCode 只在 app.mail.dev-mode=true 时返回，正式环境必须为 null */
    public record SendResult(String devCode, int expireSeconds, int resendAfterSeconds, String provider) {
    }

    /**
     * 下发验证码。
     *
     * 注意：这里刻意不加 @Transactional。SMTP 是外部阻塞调用，若包在事务里，
     * 一旦超时会把数据库连接和行锁一起拖住；改成「先写记录 → 发送 → 失败按 id 删除」。
     */
    public SendResult send(String email, String scene, String clientIp) {
        if (!emailCodec.isValid(email)) {
            throw BizException.of(ErrorCodes.EMAIL_INVALID, "请输入正确的邮箱地址");
        }
        String normalized = emailCodec.normalize(email);
        String emailHash = emailCodec.hash(normalized);
        LocalDateTime now = LocalDateTime.now();
        AppProperties.Mail cfg = properties.getMail();

        EmailCodeDao.CodeRow latest = emailCodeDao.findLatest(emailHash, scene);
        if (latest != null) {
            long elapsed = Duration.between(latest.createdAt(), now).getSeconds();
            if (elapsed < cfg.getResendSeconds()) {
                throw BizException.of(ErrorCodes.MAIL_TOO_FREQUENT,
                        "同一邮箱 " + cfg.getResendSeconds() + " 秒内不重复发送，请 "
                                + (cfg.getResendSeconds() - elapsed) + " 秒后重试");
            }
        }
        int sentToday = emailCodeDao.countSince(emailHash, scene, LocalDate.now().atStartOfDay());
        if (sentToday >= cfg.getDailyLimit()) {
            throw BizException.of(ErrorCodes.MAIL_DAILY_LIMIT, "该邮箱今日验证码次数已达上限，请明日再试");
        }

        String code = cfg.isDevMode() ? cfg.getDevCode() : randomCode();
        String codeHash = emailCodec.sha256(scene + "|" + normalized + "|" + code);
        LocalDateTime expireAt = now.plusMinutes(cfg.getExpireMinutes());
        long id = emailCodeDao.insert(emailHash, scene, codeHash, expireAt, clientIp, now);

        try {
            mailSender.sendCode(normalized, code, cfg.getExpireMinutes());
        } catch (MailSendException e) {
            // 发送失败必须回滚记录：否则用户没收到码，却已经被频控和单日额度占用
            emailCodeDao.deleteById(id);
            log.warn("验证码邮件发送失败，已回滚记录 emailHash={}", emailHash.substring(0, 8) + "...");
            throw BizException.of(ErrorCodes.MAIL_SEND_FAIL, "邮件发送失败，请稍后重试或更换邮箱");
        }

        log.info("邮箱验证码已下发 provider={} emailHash={} devMode={}",
                mailSender.provider(), emailHash.substring(0, 8) + "...", cfg.isDevMode());

        String devCode = cfg.isDevMode() ? code : null;
        return new SendResult(devCode, cfg.getExpireMinutes() * 60, cfg.getResendSeconds(), mailSender.provider());
    }

    /** 校验并消费验证码；失败不泄露「邮箱是否存在」等额外信息 */
    public void verifyAndConsume(String email, String code, String scene) {
        if (!emailCodec.isValid(email)) {
            throw BizException.of(ErrorCodes.EMAIL_INVALID, "请输入正确的邮箱地址");
        }
        if (code == null || !code.matches("\\d{4,6}")) {
            throw BizException.of(ErrorCodes.MAIL_CODE_INVALID, "请输入收到的验证码");
        }
        String normalized = emailCodec.normalize(email);
        String emailHash = emailCodec.hash(normalized);
        EmailCodeDao.CodeRow row = emailCodeDao.findLatestUnused(emailHash, scene);
        if (row == null) {
            throw BizException.of(ErrorCodes.MAIL_CODE_INVALID, "请先获取验证码");
        }
        LocalDateTime now = LocalDateTime.now();
        if (row.expireAt().isBefore(now)) {
            throw BizException.of(ErrorCodes.MAIL_CODE_EXPIRED, "验证码已过期，请重新获取");
        }
        String expected = emailCodec.sha256(scene + "|" + normalized + "|" + code);
        if (!expected.equals(row.codeHash())) {
            throw BizException.of(ErrorCodes.MAIL_CODE_INVALID, "验证码不正确");
        }
        emailCodeDao.markUsed(row.id(), now);
    }

    private String randomCode() {
        return String.valueOf(100000 + RANDOM.nextInt(900000));
    }
}
