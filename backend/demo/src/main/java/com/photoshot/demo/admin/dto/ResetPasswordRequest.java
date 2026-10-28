package com.photoshot.demo.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** 重置他人密码（F-ADM-03）：重置后账号进入「必须改密」状态 */
public record ResetPasswordRequest(
        @NotBlank(message = "请输入新密码")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[\\w!@#$%^&*._-]{8,32}$",
                message = "新密码需 8~32 位，且同时包含字母与数字")
        String newPassword,
        String reason
) {
}
