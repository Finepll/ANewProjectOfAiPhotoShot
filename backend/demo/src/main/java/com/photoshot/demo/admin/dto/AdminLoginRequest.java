package com.photoshot.demo.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 管理员登录请求（F-ADM-01）。
 * 后台不提供自助注册：账号由超管在「管理员与权限」中分配，或由部署时的引导配置创建。
 */
public record AdminLoginRequest(
        @NotBlank(message = "请输入账号")
        @Pattern(regexp = "^[A-Za-z0-9_]{3,32}$", message = "账号为 3~32 位字母、数字或下划线")
        String username,

        @NotBlank(message = "请输入密码")
        String password
) {
}
