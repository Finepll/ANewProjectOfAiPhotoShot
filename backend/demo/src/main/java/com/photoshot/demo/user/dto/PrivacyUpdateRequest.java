package com.photoshot.demo.user.dto;

/** 隐私设置更新请求（F-ACC-03 / F-ACC-04）：只存开关，不存图片与人脸数据 */
public record PrivacyUpdateRequest(
        Integer localMode,
        Integer cloudAllowed,
        Integer faceFeatureSaved,
        Integer autoCleanDays
) {
}
