package com.photoshot.demo.user.dao;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 短信验证码 DAO（app_sms_code）。
 * 只存验证码哈希；频控与有效期判断都基于数据库时间写入的时间列，不依赖客户端。
 */
@Repository
@RequiredArgsConstructor
public class SmsCodeDao {

    /** 最近一条验证码的查询结果 */
    public record CodeRow(long id, String codeHash, LocalDateTime expireAt, LocalDateTime createdAt) {
    }

    private final JdbcTemplate jdbc;

    public void insert(String phoneHash, String scene, String codeHash, LocalDateTime expireAt,
                       String sendIp, LocalDateTime createdAt) {
        jdbc.update("INSERT INTO app_sms_code (phone_hash, scene, code_hash, expire_at, used, send_ip, created_at) "
                        + "VALUES (?, ?, ?, ?, 0, ?, ?)",
                phoneHash, scene, codeHash, expireAt, sendIp, createdAt);
    }

    public CodeRow findLatest(String phoneHash, String scene) {
        List<CodeRow> list = jdbc.query(
                "SELECT id, code_hash, expire_at, created_at FROM app_sms_code "
                        + "WHERE phone_hash = ? AND scene = ? ORDER BY id DESC",
                (rs, rowNum) -> new CodeRow(
                        rs.getLong("id"),
                        rs.getString("code_hash"),
                        rs.getTimestamp("expire_at").toLocalDateTime(),
                        rs.getTimestamp("created_at").toLocalDateTime()),
                phoneHash, scene);
        return list.isEmpty() ? null : list.get(0);
    }

    /** 单日下发次数（防刷） */
    public int countSince(String phoneHash, String scene, LocalDateTime since) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM app_sms_code WHERE phone_hash = ? AND scene = ? AND created_at >= ?",
                Integer.class, phoneHash, scene, since);
        return count == null ? 0 : count;
    }

    /** 取最近一条未使用的有效验证码（用于校验） */
    public CodeRow findLatestUnused(String phoneHash, String scene) {
        List<CodeRow> list = jdbc.query(
                "SELECT id, code_hash, expire_at, created_at FROM app_sms_code "
                        + "WHERE phone_hash = ? AND scene = ? AND used = 0 ORDER BY id DESC",
                (rs, rowNum) -> new CodeRow(
                        rs.getLong("id"),
                        rs.getString("code_hash"),
                        rs.getTimestamp("expire_at").toLocalDateTime(),
                        rs.getTimestamp("created_at").toLocalDateTime()),
                phoneHash, scene);
        return list.isEmpty() ? null : list.get(0);
    }

    public void markUsed(long id, LocalDateTime usedAt) {
        jdbc.update("UPDATE app_sms_code SET used = 1, used_at = ? WHERE id = ?", usedAt, id);
    }

    /** 清理过期验证码（可由定时任务调用） */
    public int deleteExpired(LocalDateTime before) {
        return jdbc.update("DELETE FROM app_sms_code WHERE expire_at < ?", before);
    }
}
