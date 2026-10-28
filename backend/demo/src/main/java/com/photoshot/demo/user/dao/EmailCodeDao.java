package com.photoshot.demo.user.dao;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 邮箱验证码 DAO（app_email_code）。
 * 只存验证码哈希；频控与有效期判断都基于数据库写入的时间列，不依赖客户端时间。
 */
@Repository
@RequiredArgsConstructor
public class EmailCodeDao {

    public record CodeRow(long id, String codeHash, LocalDateTime expireAt, LocalDateTime createdAt) {
    }

    private final JdbcTemplate jdbc;

    /** 返回自增主键：发送失败时要按 id 回滚这条记录 */
    public long insert(String emailHash, String scene, String codeHash, LocalDateTime expireAt,
                       String sendIp, LocalDateTime createdAt) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO app_email_code (email_hash, scene, code_hash, expire_at, used, send_ip, created_at) "
                            + "VALUES (?, ?, ?, ?, 0, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, emailHash);
            ps.setString(2, scene);
            ps.setString(3, codeHash);
            ps.setObject(4, expireAt);
            ps.setString(5, sendIp);
            ps.setObject(6, createdAt);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0L : key.longValue();
    }

    public CodeRow findLatest(String emailHash, String scene) {
        List<CodeRow> list = jdbc.query(
                "SELECT id, code_hash, expire_at, created_at FROM app_email_code "
                        + "WHERE email_hash = ? AND scene = ? ORDER BY id DESC",
                (rs, rowNum) -> new CodeRow(
                        rs.getLong("id"),
                        rs.getString("code_hash"),
                        rs.getTimestamp("expire_at").toLocalDateTime(),
                        rs.getTimestamp("created_at").toLocalDateTime()),
                emailHash, scene);
        return list.isEmpty() ? null : list.get(0);
    }

    public int countSince(String emailHash, String scene, LocalDateTime since) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM app_email_code WHERE email_hash = ? AND scene = ? AND created_at >= ?",
                Integer.class, emailHash, scene, since);
        return count == null ? 0 : count;
    }

    public CodeRow findLatestUnused(String emailHash, String scene) {
        List<CodeRow> list = jdbc.query(
                "SELECT id, code_hash, expire_at, created_at FROM app_email_code "
                        + "WHERE email_hash = ? AND scene = ? AND used = 0 ORDER BY id DESC",
                (rs, rowNum) -> new CodeRow(
                        rs.getLong("id"),
                        rs.getString("code_hash"),
                        rs.getTimestamp("expire_at").toLocalDateTime(),
                        rs.getTimestamp("created_at").toLocalDateTime()),
                emailHash, scene);
        return list.isEmpty() ? null : list.get(0);
    }

    public void markUsed(long id, LocalDateTime usedAt) {
        jdbc.update("UPDATE app_email_code SET used = 1, used_at = ? WHERE id = ?", usedAt, id);
    }

    /** 发送失败时回滚：删掉刚写入的记录，避免占用频控额度 */
    public void deleteById(long id) {
        jdbc.update("DELETE FROM app_email_code WHERE id = ?", id);
    }

    public int deleteExpired(LocalDateTime before) {
        return jdbc.update("DELETE FROM app_email_code WHERE expire_at < ?", before);
    }
}
