package com.photoshot.demo.user.dao;

import com.photoshot.demo.user.entity.PrivacySetting;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** 隐私设置 DAO（app_user_privacy）：只存开关与计数 */
@Repository
@RequiredArgsConstructor
public class PrivacyDao {

    private static final RowMapper<PrivacySetting> MAPPER = (rs, rowNum) -> {
        PrivacySetting setting = new PrivacySetting();
        setting.setUserId(rs.getLong("user_id"));
        setting.setLocalMode(rs.getInt("local_mode"));
        setting.setCloudAllowed(rs.getInt("cloud_allowed"));
        setting.setFaceFeatureSaved(rs.getInt("face_feature_saved"));
        setting.setAutoCleanDays(rs.getInt("auto_clean_days"));
        setting.setUpCount(rs.getInt("up_count"));
        setting.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return setting;
    };

    private final JdbcTemplate jdbc;

    public PrivacySetting find(long userId) {
        List<PrivacySetting> list = jdbc.query("SELECT * FROM app_user_privacy WHERE user_id = ?", MAPPER, userId);
        return list.isEmpty() ? null : list.get(0);
    }

    /** 注册时给默认值：本地隐私模式开、云授权关、不保留人脸特征 */
    public PrivacySetting findOrCreate(long userId, LocalDateTime now) {
        PrivacySetting exists = find(userId);
        if (exists != null) {
            return exists;
        }
        jdbc.update("INSERT INTO app_user_privacy (user_id, local_mode, cloud_allowed, face_feature_saved, "
                        + "auto_clean_days, up_count, updated_at) VALUES (?, 1, 0, 0, 7, 0, ?)",
                userId, now);
        return find(userId);
    }

    public void update(long userId, Integer localMode, Integer cloudAllowed, Integer faceFeatureSaved,
                       Integer autoCleanDays, LocalDateTime now) {
        jdbc.update("UPDATE app_user_privacy SET local_mode = COALESCE(?, local_mode), "
                        + "cloud_allowed = COALESCE(?, cloud_allowed), "
                        + "face_feature_saved = COALESCE(?, face_feature_saved), "
                        + "auto_clean_days = COALESCE(?, auto_clean_days), updated_at = ? WHERE user_id = ?",
                localMode, cloudAllowed, faceFeatureSaved, autoCleanDays, now, userId);
    }

    /** 上行计数 +1（F-CLD-02，客户端确认后上报） */
    public void increaseUpCount(long userId, LocalDateTime now) {
        jdbc.update("UPDATE app_user_privacy SET up_count = up_count + 1, updated_at = ? WHERE user_id = ?", now, userId);
    }
}
