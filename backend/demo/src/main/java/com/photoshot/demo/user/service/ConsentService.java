package com.photoshot.demo.user.service;

import com.photoshot.demo.config.AppProperties;
import com.photoshot.demo.user.dao.UserConsentDao;
import com.photoshot.demo.user.entity.UserConsent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 协议与肖像权授权服务（F-ACC-02）。
 * 签署时生成存证指纹：SHA-256(用户 + 协议 + 版本 + 时间 + 设备)，客户端本机留存同一份。
 */
@Service
@RequiredArgsConstructor
public class ConsentService {

    /** 三类必须签署的协议 */
    public static final String CODE_PORTRAIT = "PORTRAIT";
    public static final String CODE_PRIVACY = "PRIVACY";
    public static final String CODE_SERVICE = "SERVICE";

    private static final List<String> ALL_CODES = List.of(CODE_PORTRAIT, CODE_PRIVACY, CODE_SERVICE);

    private final UserConsentDao userConsentDao;
    private final PhoneCodec phoneCodec;
    private final AppProperties properties;

    public static List<String> allCodes() {
        return ALL_CODES;
    }

    public boolean isValidCode(String code) {
        return ALL_CODES.contains(code);
    }

    public String defaultVersion(String version) {
        return (version == null || version.isBlank()) ? properties.getUser().getDefaultAgreementVersion() : version;
    }

    public UserConsent sign(long userId, String code, String version, String deviceId, String clientIp) {
        String agreementVersion = defaultVersion(version);
        LocalDateTime now = LocalDateTime.now();
        String signHash = phoneCodec.sha256(userId + "|" + code + "|" + agreementVersion + "|" + now + "|" + deviceId);
        userConsentDao.upsert(userId, code, agreementVersion, signHash, deviceId, clientIp, now);
        return userConsentDao.find(userId, code, agreementVersion).orElse(null);
    }

    public void revoke(long userId, String code, String version, String reason) {
        userConsentDao.revoke(userId, code, defaultVersion(version), reason, LocalDateTime.now());
    }

    public List<UserConsent> list(long userId) {
        return userConsentDao.listByUser(userId);
    }

    public List<String> effectiveCodes(long userId) {
        return userConsentDao.effectiveCodes(userId);
    }

    /** 三类协议是否都已签署（未签署时拍摄与导出入口不可用，见 F-ACC-02 规则） */
    public boolean allSigned(long userId) {
        return effectiveCodes(userId).containsAll(ALL_CODES);
    }
}
