package com.photoshot.demo.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 分配管理员账号请求（F-ADM-03）。
 * 分配制：只有超级管理员能创建账号，被创建账号首次登录必须改密。
 */
public record CreateAdminRequest(
        @NotBlank(message = "请输入账号")
        @Pattern(regexp = "^[A-Za-z0-9_]{3,32}$", message = "账号为 3~32 位字母、数字或下划线")
        String username,

        @NotBlank(message = "请输入初始密码")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[\\w!@#$%^&*._-]{8,32}$",
                message = "初始密码需 8~32 位，且同时包含字母与数字")
        String password,

        String realName,
        String phoneMasked,
        String emailMasked,

        /** 角色码：SUPER_ADMIN / OPS / AUDITOR */
        @NotBlank(message = "请选择角色")
        String roleCode
) {
}
