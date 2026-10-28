package com.photoshot.demo.user.dao;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 额度账户与流水 DAO（app_quota_account / app_quota_flow）。
 * 所有变动必须带业务号（biz_no），唯一索引保证幂等；与 F-SRV-03、F-ADM-02 共用同一口径。
 */
@Repository
@RequiredArgsConstructor
public class QuotaDao {

    /** 额度账户快照 */
    public record Account(long userId, int balance, int totalGranted, int totalUsed, int version) {
    }

    /** 额度流水行 */
    public record Flow(long id, String bizNo, long userId, int changeType, int delta, int balanceAfter,
                       String taskNo, String orderNo, String operator, String remark, LocalDateTime createdAt) {
    }

    private final JdbcTemplate jdbc;

    public Account findAccount(long userId) {
        List<Account> list = jdbc.query(
                "SELECT user_id, balance, total_granted, total_used, version FROM app_quota_account WHERE user_id = ?",
                (rs, rowNum) -> new Account(rs.getLong("user_id"), rs.getInt("balance"),
                        rs.getInt("total_granted"), rs.getInt("total_used"), rs.getInt("version")),
                userId);
        return list.isEmpty() ? null : list.get(0);
    }

    /** 行锁读取，供事务内更新使用 */
    public Account lockAccount(long userId) {
        List<Account> list = jdbc.query(
                "SELECT user_id, balance, total_granted, total_used, version FROM app_quota_account "
                        + "WHERE user_id = ? FOR UPDATE",
                (rs, rowNum) -> new Account(rs.getLong("user_id"), rs.getInt("balance"),
                        rs.getInt("total_granted"), rs.getInt("total_used"), rs.getInt("version")),
                userId);
        return list.isEmpty() ? null : list.get(0);
    }

    public void insertAccount(long userId, LocalDateTime now) {
        jdbc.update("INSERT INTO app_quota_account (user_id, balance, total_granted, total_used, version, updated_at) "
                + "VALUES (?, 0, 0, 0, 0, ?)", userId, now);
    }

    public void updateAccount(long userId, int balance, int totalGranted, int totalUsed, int version, LocalDateTime now) {
        jdbc.update("UPDATE app_quota_account SET balance = ?, total_granted = ?, total_used = ?, version = ?, "
                        + "updated_at = ? WHERE user_id = ?",
                balance, totalGranted, totalUsed, version, now, userId);
    }

    public boolean flowExists(String bizNo) {
        Integer count = jdbc.queryForObject("SELECT COUNT(1) FROM app_quota_flow WHERE biz_no = ?", Integer.class, bizNo);
        return count != null && count > 0;
    }

    public void insertFlow(String bizNo, long userId, int changeType, int delta, int balanceAfter,
                           String taskNo, String orderNo, String operator, String remark, LocalDateTime now) {
        jdbc.update("INSERT INTO app_quota_flow (biz_no, user_id, change_type, delta, balance_after, task_no, order_no, "
                        + "operator, remark, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                bizNo, userId, changeType, delta, balanceAfter, taskNo, orderNo, operator, remark, now);
    }

    public List<Flow> listFlows(long userId, int limit) {
        return jdbc.query("SELECT id, biz_no, user_id, change_type, delta, balance_after, task_no, order_no, operator, "
                        + "remark, created_at FROM app_quota_flow WHERE user_id = ? ORDER BY id DESC LIMIT " + Math.max(1, limit),
                (rs, rowNum) -> new Flow(rs.getLong("id"), rs.getString("biz_no"), rs.getLong("user_id"),
                        rs.getInt("change_type"), rs.getInt("delta"), rs.getInt("balance_after"),
                        rs.getString("task_no"), rs.getString("order_no"), rs.getString("operator"),
                        rs.getString("remark"), rs.getTimestamp("created_at").toLocalDateTime()),
                userId);
    }
}
