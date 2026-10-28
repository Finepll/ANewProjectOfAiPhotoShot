package com.photoshot.demo.user.dao;

import com.photoshot.demo.user.entity.UserConsent;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** 协议签署存证 DAO（app_user_consent） */
@Repository
@RequiredArgsConstructor
public class UserConsentDao {

    private static final String COLUMNS = "id, user_id, agreement_code, agreement_version, status, signed_at, "
            + "device_id, sign_hash, client_ip, revoked_at, revoke_reason, created_at, updated_at";

    private static final RowMapper<UserConsent> MAPPER = (rs, rowNum) -> {
        UserConsent consent = new UserConsent();
        consent.setId(rs.getLong("id"));
        consent.setUserId(rs.getLong("user_id"));
        consent.setAgreementCode(rs.getString("agreement_code"));
        consent.setAgreementVersion(rs.getString("agreement_version"));
        consent.setStatus(rs.getInt("status"));
        consent.setSignedAt(rs.getTimestamp("signed_at").toLocalDateTime());
        consent.setDeviceId(rs.getString("device_id"));
        consent.setSignHash(rs.getString("sign_hash"));
        consent.setClientIp(rs.getString("client_ip"));
        consent.setRevokedAt(rs.getTimestamp("revoked_at") == null ? null : rs.getTimestamp("revoked_at").toLocalDateTime());
        consent.setRevokeReason(rs.getString("revoke_reason"));
        consent.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        consent.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return consent;
    };

    private final JdbcTemplate jdbc;

    public List<UserConsent> listByUser(long userId) {
        return jdbc.query("SELECT " + COLUMNS + " FROM app_user_consent WHERE user_id = ? ORDER BY agreement_code",
                MAPPER, userId);
    }

    public Optional<UserConsent> find(long userId, String agreementCode, String version) {
        List<UserConsent> list = jdbc.query("SELECT " + COLUMNS
                        + " FROM app_user_consent WHERE user_id = ? AND agreement_code = ? AND agreement_version = ?",
                MAPPER, userId, agreementCode, version);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    /** 签署（重复签署同一版本则刷新时间与凭证，保持一行不留历史垃圾） */
    public void upsert(long userId, String code, String version, String signHash, String deviceId,
                       String clientIp, LocalDateTime now) {
        Optional<UserConsent> exists = find(userId, code, version);
        if (exists.isEmpty()) {
            jdbc.update("INSERT INTO app_user_consent (user_id, agreement_code, agreement_version, status, signed_at, "
                            + "device_id, sign_hash, client_ip, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)",
                    userId, code, version, now, deviceId, signHash, clientIp, now, now);
            return;
        }
        jdbc.update("UPDATE app_user_consent SET status = 1, signed_at = ?, device_id = ?, sign_hash = ?, "
                        + "client_ip = ?, revoked_at = NULL, revoke_reason = NULL, updated_at = ? WHERE id = ?",
                now, deviceId, signHash, clientIp, now, exists.get().getId());
    }

    /** 撤回授权（隐私看板可随时撤回） */
    public void revoke(long userId, String code, String version, String reason, LocalDateTime now) {
        jdbc.update("UPDATE app_user_consent SET status = 0, revoked_at = ?, revoke_reason = ?, updated_at = ? "
                        + "WHERE user_id = ? AND agreement_code = ? AND agreement_version = ?",
                now, reason, now, userId, code, version);
    }

    /** 已生效的协议编号集合（登录返回给前端，用于判断是否需要弹协议） */
    public List<String> effectiveCodes(long userId) {
        return jdbc.queryForList("SELECT agreement_code FROM app_user_consent WHERE user_id = ? AND status = 1",
                String.class, userId);
    }
}
