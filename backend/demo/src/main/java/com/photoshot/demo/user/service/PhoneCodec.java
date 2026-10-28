package com.photoshot.demo.user.service;

import com.photoshot.demo.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * 手机号与凭证编码工具（F-SRV-01）。
 * 【合规】手机号只存 HMAC-SHA256(号码 + 服务端密钥) 与掩码，不存明文；
 *        验证码与签署凭证同样只存哈希。
 */
@Component
@RequiredArgsConstructor
public class PhoneCodec {

    /** 中国大陆手机号 */
    public static final Pattern PHONE_PATTERN = Pattern.compile("^1[3-9]\\d{9}$");

    private final AppProperties properties;

    public boolean isValidPhone(String phone) {
        return phone != null && PHONE_PATTERN.matcher(phone).matches();
    }

    /** 手机号哈希（不可逆，用于唯一索引与查询） */
    public String hashPhone(String phone) {
        return hmacSha256(phone, properties.getPhone().getHashSecret());
    }

    /** 脱敏展示：138****8888 */
    public String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return "****";
        }
        int head = Math.max(1, properties.getPhone().getMask().getKeepHead());
        int tail = Math.max(1, properties.getPhone().getMask().getKeepTail());
        if (head + tail >= phone.length()) {
            return phone.charAt(0) + "****";
        }
        return phone.substring(0, head) + "****" + phone.substring(phone.length() - tail);
    }

    /** 通用 SHA-256（验证码、签署指纹） */
    public String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 不可用", e);
        }
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
