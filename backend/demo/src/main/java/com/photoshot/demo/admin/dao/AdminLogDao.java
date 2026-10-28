package com.photoshot.demo.admin.dao;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 后台日志 DAO（F-ADM-04）。
 *  - sys_admin_login_log：每次登录尝试都留痕（含失败原因），用于异常登录追溯；
 *  - sys_operation_log：敏感操作（分配账号、改密、额度调整等）必写，可审计到人。
 * 【合规】日志表不写入密码、验证码、图片与人脸相关字段。
 */
@Repository
@RequiredArgsConstructor
public class AdminLogDao {

    /** 登录日志行（后台「操作审计」页展示） */
    public record LoginLog(long id, long adminId, String username, int result, String failReason, String clientIp,
                           String userAgent, LocalDateTime createdAt) {
    }

    /** 操作日志行 */
    public record OperationLog(long id, long adminId, String username, String module, String action, String bizNo,
                               String clientIp, LocalDateTime createdAt) {
    }

    private final JdbcTemplate jdbc;

    public void insertLoginLog(long adminId, String username, boolean success, String failReason,
                               String clientIp, String userAgent) {
        jdbc.update("INSERT INTO sys_admin_login_log (admin_id, username, result, fail_reason, client_ip, user_agent, "
                        + "created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                adminId, username, success ? 1 : 0, failReason == null ? "" : truncate(failReason, 200),
                clientIp, truncate(userAgent, 300), LocalDateTime.now());
    }

    public void insertOperationLog(long adminId, String username, String module, String action, String bizNo,
                                   String beforeJson, String afterJson, String clientIp) {
        jdbc.update("INSERT INTO sys_operation_log (admin_id, username, module, action, biz_no, before_json, "
                        + "after_json, client_ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                adminId, username, module, action, bizNo, truncate(beforeJson, 2000), truncate(afterJson, 2000),
                clientIp, LocalDateTime.now());
    }

    /** 登录日志分页（只读展示，不支持修改删除，保证审计可信） */
    public List<LoginLog> listLoginLogs(int limit) {
        return jdbc.query("SELECT id, admin_id, username, result, fail_reason, client_ip, user_agent, created_at "
                        + "FROM sys_admin_login_log ORDER BY id DESC LIMIT " + safeLimit(limit),
                (rs, rowNum) -> new LoginLog(rs.getLong("id"), rs.getLong("admin_id"), rs.getString("username"),
                        rs.getInt("result"), rs.getString("fail_reason"), rs.getString("client_ip"),
                        rs.getString("user_agent"), rs.getTimestamp("created_at").toLocalDateTime()));
    }

    /** 操作日志分页 */
    public List<OperationLog> listOperationLogs(int limit) {
        return jdbc.query("SELECT id, admin_id, username, module, action, biz_no, client_ip, created_at "
                        + "FROM sys_operation_log ORDER BY id DESC LIMIT " + safeLimit(limit),
                (rs, rowNum) -> new OperationLog(rs.getLong("id"), rs.getLong("admin_id"), rs.getString("username"),
                        rs.getString("module"), rs.getString("action"), rs.getString("biz_no"),
                        rs.getString("client_ip"), rs.getTimestamp("created_at").toLocalDateTime()));
    }

    private int safeLimit(int limit) {
        return Math.min(Math.max(limit, 1), 200);
    }

    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() > max ? value.substring(0, max) : value;
    }
}
