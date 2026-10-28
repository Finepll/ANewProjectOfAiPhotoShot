package com.photoshot.demo.admin.dao;

import com.photoshot.demo.admin.entity.SysAdmin;
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

/** 后台管理员账号 DAO（sys_admin + 角色/权限聚合，SQL 兼容 MySQL 8 与 H2） */
@Repository
@RequiredArgsConstructor
public class AdminDao {

    private static final String COLUMNS = "id, username, password_hash, real_name, phone_masked, email_masked, "
            + "status, must_change_password, fail_count, locked_until, last_login_at, last_login_ip, created_by, "
            + "created_at, updated_at";

    private static final RowMapper<SysAdmin> MAPPER = (rs, rowNum) -> {
        SysAdmin admin = new SysAdmin();
        admin.setId(rs.getLong("id"));
        admin.setUsername(rs.getString("username"));
        admin.setPasswordHash(rs.getString("password_hash"));
        admin.setRealName(rs.getString("real_name"));
        admin.setPhoneMasked(rs.getString("phone_masked"));
        admin.setEmailMasked(rs.getString("email_masked"));
        admin.setStatus(rs.getInt("status"));
        admin.setMustChangePassword(rs.getInt("must_change_password"));
        admin.setFailCount(rs.getInt("fail_count"));
        admin.setLockedUntil(rs.getTimestamp("locked_until") == null ? null : rs.getTimestamp("locked_until").toLocalDateTime());
        admin.setLastLoginAt(rs.getTimestamp("last_login_at") == null ? null : rs.getTimestamp("last_login_at").toLocalDateTime());
        admin.setLastLoginIp(rs.getString("last_login_ip"));
        admin.setCreatedBy(rs.getLong("created_by"));
        admin.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        admin.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return admin;
    };

    private final JdbcTemplate jdbc;

    public Optional<SysAdmin> findByUsername(String username) {
        List<SysAdmin> list = jdbc.query("SELECT " + COLUMNS + " FROM sys_admin WHERE username = ?", MAPPER, username);
        return list.isEmpty() ? Optional.empty() : Optional.of(decorate(list.get(0)));
    }

    public Optional<SysAdmin> findById(long id) {
        List<SysAdmin> list = jdbc.query("SELECT " + COLUMNS + " FROM sys_admin WHERE id = ?", MAPPER, id);
        return list.isEmpty() ? Optional.empty() : Optional.of(decorate(list.get(0)));
    }

    public List<SysAdmin> listAll() {
        return jdbc.query("SELECT " + COLUMNS + " FROM sys_admin ORDER BY id", MAPPER).stream()
                .map(this::decorate)
                .toList();
    }

    public boolean usernameExists(String username) {
        Integer count = jdbc.queryForObject("SELECT COUNT(1) FROM sys_admin WHERE username = ?", Integer.class, username);
        return count != null && count > 0;
    }

    public long insert(SysAdmin admin) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO sys_admin (username, password_hash, real_name, phone_masked, email_masked, status, "
                            + "must_change_password, fail_count, created_by, created_at, updated_at) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, admin.getUsername());
            ps.setString(2, admin.getPasswordHash());
            ps.setString(3, admin.getRealName() == null ? "" : admin.getRealName());
            ps.setString(4, admin.getPhoneMasked() == null ? "" : admin.getPhoneMasked());
            ps.setString(5, admin.getEmailMasked() == null ? "" : admin.getEmailMasked());
            ps.setInt(6, admin.getStatus() == null ? 1 : admin.getStatus());
            ps.setInt(7, admin.getMustChangePassword() == null ? 1 : admin.getMustChangePassword());
            ps.setLong(8, admin.getCreatedBy() == null ? 0L : admin.getCreatedBy());
            ps.setObject(9, admin.getCreatedAt());
            ps.setObject(10, admin.getUpdatedAt());
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0L : key.longValue();
    }

    /** 登录失败：累计次数并（达到上限时）写锁定截止时间 */
    public void updateLoginFail(long id, int failCount, LocalDateTime lockedUntil, LocalDateTime now) {
        jdbc.update("UPDATE sys_admin SET fail_count = ?, locked_until = ?, updated_at = ? WHERE id = ?",
                failCount, lockedUntil, now, id);
    }

    /** 登录成功：清零失败计数、解除锁定、记录时间与 IP（IP 只记，不做地理定位） */
    public void resetFailAndUpdateLogin(long id, String clientIp, LocalDateTime now) {
        jdbc.update("UPDATE sys_admin SET fail_count = 0, locked_until = NULL, last_login_at = ?, last_login_ip = ?, "
                + "updated_at = ? WHERE id = ?", now, clientIp, now, id);
    }

    public void updatePassword(long id, String passwordHash, boolean clearMustChange, LocalDateTime now) {
        jdbc.update("UPDATE sys_admin SET password_hash = ?, must_change_password = ?, updated_at = ? WHERE id = ?",
                passwordHash, clearMustChange ? 0 : 1, now, id);
    }

    /** 启停账号（停用后不再签发令牌；已签发令牌由拦截器放行至过期，敏感操作另有校验） */
    public int updateStatus(long id, int status, LocalDateTime now) {
        return jdbc.update("UPDATE sys_admin SET status = ?, updated_at = ? WHERE id = ?", status, now, id);
    }

    public int updateProfile(long id, String realName, String phoneMasked, String emailMasked, LocalDateTime now) {
        return jdbc.update("UPDATE sys_admin SET real_name = ?, phone_masked = ?, email_masked = ?, updated_at = ? "
                + "WHERE id = ?", realName, phoneMasked, emailMasked, now, id);
    }

    /* ---------- 角色与权限 ---------- */

    /** 绑定角色（按 role_code 反查 id；已绑定则忽略） */
    public void bindRole(long adminId, String roleCode, LocalDateTime now) {
        Integer count = jdbc.queryForObject("SELECT COUNT(1) FROM sys_admin_role ar JOIN sys_role r ON r.id = ar.role_id "
                + "WHERE ar.admin_id = ? AND r.role_code = ?", Integer.class, adminId, roleCode);
        if (count != null && count > 0) {
            return;
        }
        jdbc.update("INSERT INTO sys_admin_role (admin_id, role_id, created_at) "
                + "SELECT ?, id, ? FROM sys_role WHERE role_code = ?", adminId, now, roleCode);
    }

    public void unbindRoles(long adminId) {
        jdbc.update("DELETE FROM sys_admin_role WHERE admin_id = ?", adminId);
    }

    public List<String> listRoleCodes(long adminId) {
        return jdbc.queryForList("SELECT r.role_code FROM sys_admin_role ar JOIN sys_role r ON r.id = ar.role_id "
                + "WHERE ar.admin_id = ? ORDER BY r.id", String.class, adminId);
    }

    public List<String> listPermissionCodes(long adminId) {
        return jdbc.queryForList("SELECT DISTINCT p.perm_code FROM sys_admin_role ar "
                + "JOIN sys_role_permission rp ON rp.role_id = ar.role_id "
                + "JOIN sys_permission p ON p.id = rp.permission_id "
                + "WHERE ar.admin_id = ? ORDER BY p.perm_code", String.class, adminId);
    }

    /** 角色下拉：id + 角色码 + 名称 */
    public List<String[]> listRoles() {
        return jdbc.query("SELECT role_code, role_name FROM sys_role WHERE status = 1 ORDER BY id",
                (rs, rowNum) -> new String[]{rs.getString("role_code"), rs.getString("role_name")});
    }

    public long countAll() {
        Long count = jdbc.queryForObject("SELECT COUNT(1) FROM sys_admin", Long.class);
        return count == null ? 0L : count;
    }

    private SysAdmin decorate(SysAdmin admin) {
        admin.setRoles(listRoleCodes(admin.getId()));
        admin.setPermissions(listPermissionCodes(admin.getId()));
        return admin;
    }
}
