package com.photoshot.demo.user.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 隐私设置（app_user_privacy，F-ACC-03 / F-ACC-04）。
 * 服务端只存开关与上行计数，不存图片、蒙版与人脸特征。
 */
@Data
public class PrivacySetting {

    private Long userId;
    /** 本地隐私模式，默认开启 */
    private Integer localMode;
    /** 云端能力是否已授权（仍需逐次确认） */
    private Integer cloudAllowed;
    /** 是否在本机保留人脸特征（服务端只记开关） */
    private Integer faceFeatureSaved;
    private Integer autoCleanDays;
    /** 上行计数（端侧统计上报） */
    private Integer upCount;
    private LocalDateTime updatedAt;
}
