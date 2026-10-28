package com.photoshot.demo.user.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * C 端用户（app_user）。
 * 【合规】只存手机号哈希与掩码，不存明文；不含任何人脸特征字段。
 */
@Data
public class AppUser {

    private Long id;
    private String phoneHash;
    private String phoneMasked;
    /** 邮箱登录用户的标识哈希；手机号注册的用户为 null（两者互斥但都不存明文） */
    private String emailHash;
    private String emailMasked;
    private String nickname;
    /** 1正常 0封禁 */
    private Integer status;
    private String banReason;
    private LocalDateTime bannedAt;
    private Long bannedBy;
    private String registerSource;
    private String registerIp;
    private LocalDateTime registerAt;
    private LocalDateTime lastLoginAt;
    private Integer loginCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public boolean isBanned() {
        return status != null && status == 0;
    }

    /** 对外展示的账号标识：优先手机号掩码，其次邮箱掩码 */
    public String accountMasked() {
        return phoneMasked != null && !phoneMasked.isBlank() ? phoneMasked : emailMasked;
    }
}
