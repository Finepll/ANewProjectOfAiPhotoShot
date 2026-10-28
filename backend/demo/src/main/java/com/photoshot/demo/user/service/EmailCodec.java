package com.photoshot.demo.user.service;

import com.photoshot.demo.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * 邮箱编码工具（与 PhoneCodec 同一套合规口径）。
 * 【合规】邮箱只存 HMAC-SHA256(规范化邮箱 + 服务端密钥) 与掩码，不存明文；
 *        明文只在本次请求内存中出现，用于投递邮件。
 */
@Component
@RequiredArgsConstructor
public class EmailCodec {

    /** 常规邮箱格式：本地部分允许 . _ % + -，域名必须带点 */
    public static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$");

    private static final int MAX_LENGTH = 254;

    private final AppProperties properties;

    /** 规范化：去空格、转小写（邮箱域名与本地部分在实际投递中均不区分大小写） */
    public String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public boolean isValid(String email) {
        String normalized = normalize(email);
        return normalized != null
                && normalized.length() <= MAX_LENGTH
                && EMAIL_PATTERN.matcher(normalized).matches();
    }

    /** 邮箱哈希（不可逆，用于唯一索引与查询） */
    public String hash(String email) {
        return hmacSha256(normalize(email), secret());
    }

    /** 脱敏展示：someone@example.com → s***@example.com */
    public String mask(String email) {
        String normalized = normalize(email);
        if (normalized == null) {
            return "****";
        }
        int at = normalized.indexOf('@');
        if (at <= 0) {
            return "****";
        }
        return normalized.charAt(0) + "***" + normalized.substring(at);
    }

    /** 昵称后缀：取哈希前 4 位，不含邮箱任何片段 */
    public String nicknameSuffix(String emailHash) {
        return emailHash == null || emailHash.length() < 4 ? "0000" : emailHash.substring(0, 4);
    }

    /** 通用 SHA-256（验证码哈希），与短信通道同一套规则 */
    public String sha256(String raw) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 不可用", e);
        }
    }

    private String secret() {
        String mailSecret = properties.getMail().getHashSecret();
        return mailSecret == null || mailSecret.isBlank()
                ? properties.getPhone().getHashSecret()
                : mailSecret;
    }

    private String hmacSha256(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 不可用", e);
        }
    }
}
