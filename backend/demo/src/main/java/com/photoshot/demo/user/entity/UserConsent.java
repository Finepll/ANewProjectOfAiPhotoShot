package com.photoshot.demo.user.entity;

import lombok.Data;

import java.time.LocalDateTime;

/** 协议与肖像权授权存证（app_user_consent，F-ACC-02） */
@Data
public class UserConsent {

    private Long id;
    private Long userId;
    /** PORTRAIT 肖像权授权 / PRIVACY 隐私政策 / SERVICE 用户服务协议 */
    private String agreementCode;
    private String agreementVersion;
    /** 1有效 0已撤回 */
    private Integer status;
    private LocalDateTime signedAt;
    private String deviceId;
    private String signHash;
    private String clientIp;
    private LocalDateTime revokedAt;
    private String revokeReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
