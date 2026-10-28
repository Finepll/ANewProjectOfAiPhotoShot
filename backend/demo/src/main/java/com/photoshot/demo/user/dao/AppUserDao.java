package com.photoshot.demo.user.dao;

import com.photoshot.demo.user.entity.AppUser;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** C 端用户 DAO（SQL 同时兼容 MySQL 8 与 H2） */
@Repository
@RequiredArgsConstructor
public class AppUserDao {

    private static final String COLUMNS = "id, phone_hash, phone_masked, email_hash, email_masked, nickname, "
            + "status, ban_reason, banned_at, banned_by, register_source, register_ip, register_at, "
            + "last_login_at, login_count, created_at, updated_at";

    private static final RowMapper<AppUser> MAPPER = (rs, rowNum) -> {
        AppUser user = new AppUser();
        user.setId(rs.getLong("id"));
        user.setPhoneHash(rs.getString("phone_hash"));
        user.setPhoneMasked(rs.getString("phone_masked"));
        user.setEmailHash(rs.getString("email_hash"));
        user.setEmailMasked(rs.getString("email_masked"));
        user.setNickname(rs.getString("nickname"));
        user.setStatus(rs.getInt("status"));
        user.setBanReason(rs.getString("ban_reason"));
        user.setBannedAt(rs.getTimestamp("banned_at") == null ? null : rs.getTimestamp("banned_at").toLocalDateTime());
        user.setBannedBy(rs.getObject("banned_by") == null ? null : rs.getLong("banned_by"));
        user.setRegisterSource(rs.getString("register_source"));
        user.setRegisterIp(rs.getString("register_ip"));
        user.setRegisterAt(rs.getTimestamp("register_at").toLocalDateTime());
        user.setLastLoginAt(rs.getTimestamp("last_login_at") == null ? null : rs.getTimestamp("last_login_at").toLocalDateTime());
        user.setLoginCount(rs.getInt("login_count"));
        user.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        user.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return user;
    };

    private final JdbcTemplate jdbc;

    public Optional<AppUser> findByPhoneHash(String phoneHash) {
        List<AppUser> list = jdbc.query("SELECT " + COLUMNS + " FROM app_user WHERE phone_hash = ?", MAPPER, phoneHash);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<AppUser> findByEmailHash(String emailHash) {
        List<AppUser> list = jdbc.query("SELECT " + COLUMNS + " FROM app_user WHERE email_hash = ?", MAPPER, emailHash);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<AppUser> findById(long id) {
        List<AppUser> list = jdbc.query("SELECT " + COLUMNS + " FROM app_user WHERE id = ?", MAPPER, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    /** 首次登录自动注册（F-ACC-01）：返回自增主键 */
    public long insert(AppUser user) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO app_user (phone_hash, phone_masked, email_hash, email_masked, nickname, "
                            + "status, register_source, register_ip, register_at, last_login_at, "
                            + "login_count, created_at, updated_at) "
                            + "VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 0, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, user.getPhoneHash());
            ps.setString(2, user.getPhoneMasked());
            ps.setString(3, user.getEmailHash());
            ps.setString(4, user.getEmailMasked());
            ps.setString(5, user.getNickname());
            ps.setString(6, user.getRegisterSource());
            ps.setString(7, user.getRegisterIp());
            ps.setObject(8, user.getRegisterAt());
            ps.setObject(9, user.getLastLoginAt());
            ps.setObject(10, user.getCreatedAt());
            ps.setObject(11, user.getUpdatedAt());
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0L : key.longValue();
    }

    public void updateLoginSuccess(long id, LocalDateTime loginAt) {
        jdbc.update("UPDATE app_user SET last_login_at = ?, login_count = login_count + 1, updated_at = ? WHERE id = ?",
                loginAt, loginAt, id);
    }

    /** 封禁 / 解封（F-ADM-02，由后台调用） */
    public void updateStatus(long id, int status, String banReason, Long operatorId, LocalDateTime now) {
        jdbc.update("UPDATE app_user SET status = ?, ban_reason = ?, banned_at = ?, banned_by = ?, updated_at = ? WHERE id = ?",
                status, status == 0 ? banReason : null, status == 0 ? now : null, operatorId, now, id);
    }

    public long countAll() {
        Long count = jdbc.queryForObject("SELECT COUNT(1) FROM app_user", Long.class);
        return count == null ? 0L : count;
    }
}
