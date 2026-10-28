package com.photoshot.demo.admin.dto;

import java.util.List;

/** 管理员登录响应（F-ADM-01）：令牌 + 身份 + 角色 + 权限点 + 是否强制改密 */
public record AdminLoginResponse(
        String token,
        long expiresInSeconds,
        AdminInfo admin,
        List<String> roles,
        List<String> permissions,
        /** true=首次登录或密码被重置，必须先改密才能进入后台其他功能 */
        boolean mustChangePassword,
        String lastLoginAt,
        String lastLoginIp
) {
    public record AdminInfo(long id, String username, String realName, String phoneMasked, String emailMasked) {
    }
}
