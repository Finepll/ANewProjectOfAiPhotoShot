package com.photoshot.demo.user.service;

import com.photoshot.demo.common.BizException;
import com.photoshot.demo.common.ErrorCodes;
import com.photoshot.demo.config.AppProperties;
import com.photoshot.demo.user.dao.SmsCodeDao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

/**
 * 短信验证码服务（F-ACC-01 / F-SRV-01）。
 * 规则：5 分钟有效、同号码 60 秒内不重复下发、单日下发上限防刷；验证码只存哈希。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsCodeService {

    public static final String SCENE_LOGIN = "LOGIN";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final SmsCodeDao smsCodeDao;
    private final PhoneCodec phoneCodec;
    private final AppProperties properties;

    /** 下发结果：devCode 只在开发/演示模式 (app.sms.dev-mode=true) 下返回，正式环境必须为 null */
    public record SendResult(String devCode, int expireSeconds, int resendAfterSeconds) {
    }

    public SendResult send(String phone, String scene, String clientIp) {
        if (!phoneCodec.isValidPhone(phone)) {
            throw BizException.of(ErrorCodes.PHONE_INVALID, "请输入正确的 11 位手机号");
        }
        String phoneHash = phoneCodec.hashPhone(phone);
        LocalDateTime now = LocalDateTime.now();

        SmsCodeDao.CodeRow latest = smsCodeDao.findLatest(phoneHash, scene);
        if (latest != null) {
            long elapsed = java.time.Duration.between(latest.createdAt(), now).getSeconds();
            int resend = properties.getSms().getResendSeconds();
            if (elapsed < resend) {
                throw BizException.of(ErrorCodes.SMS_TOO_FREQUENT,
                        "同一号码 " + resend + " 秒内不重复下发，请 " + (resend - elapsed) + " 秒后重试");
            }
        }
        int sentToday = smsCodeDao.countSince(phoneHash, scene, LocalDate.now().atStartOfDay());
        if (sentToday >= properties.getSms().getDailyLimit()) {
            throw BizException.of(ErrorCodes.SMS_DAILY_LIMIT, "今日验证码获取次数已达上限，请明日再试");
        }

        String code = properties.getSms().isDevMode() ? properties.getSms().getDevCode() : randomCode();
        String codeHash = phoneCodec.sha256(scene + "|" + phone + "|" + code);
        LocalDateTime expireAt = now.plusSeconds(properties.getSms().getExpireSeconds());
        smsCodeDao.insert(phoneHash, scene, codeHash, expireAt, clientIp, now);

        // 【合规】日志不得出现手机号明文与验证码
        log.info("验证码已下发 scene={} phoneHash={} devMode={}", scene,
                phoneHash.substring(0, 8) + "...", properties.getSms().isDevMode());

        String devCode = properties.getSms().isDevMode() ? code : null;
        return new SendResult(devCode, properties.getSms().getExpireSeconds(), properties.getSms().getResendSeconds());
    }

    /** 校验并消费验证码；失败不泄露「号码是否存在」等额外信息 */
    public void verifyAndConsume(String phone, String code, String scene) {
        if (!phoneCodec.isValidPhone(phone)) {
            throw BizException.of(ErrorCodes.PHONE_INVALID, "请输入正确的 11 位手机号");
        }
        if (code == null || !code.matches("\\d{4,6}")) {
            throw BizException.of(ErrorCodes.SMS_CODE_INVALID, "请输入收到的验证码");
        }
        String phoneHash = phoneCodec.hashPhone(phone);
        SmsCodeDao.CodeRow row = smsCodeDao.findLatestUnused(phoneHash, scene);
        if (row == null) {
            throw BizException.of(ErrorCodes.SMS_CODE_INVALID, "请先获取验证码");
        }
        LocalDateTime now = LocalDateTime.now();
        if (row.expireAt().isBefore(now)) {
            throw BizException.of(ErrorCodes.SMS_CODE_EXPIRED, "验证码已过期，请重新获取");
        }
        String expected = phoneCodec.sha256(scene + "|" + phone + "|" + code);
        if (!expected.equals(row.codeHash())) {
            throw BizException.of(ErrorCodes.SMS_CODE_INVALID, "验证码不正确");
        }
        smsCodeDao.markUsed(row.id(), now);
    }

    private String randomCode() {
        return String.valueOf(100000 + RANDOM.nextInt(900000));
    }
}
