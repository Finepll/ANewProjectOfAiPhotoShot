package com.photoshot.demo.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** 修改密码请求（F-ADM-01：首次登录强制改密 / 日常改密共用） */
public record ChangePasswordRequest(
        @NotBlank(message = "请输入原密码")
        String oldPassword,

        @NotBlank(message = "请输入新密码")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[\\w!@#$%^&*._-]{8,32}$",
                message = "新密码需 8~32 位，且同时包含字母与数字")
        String newPassword
) {
}
