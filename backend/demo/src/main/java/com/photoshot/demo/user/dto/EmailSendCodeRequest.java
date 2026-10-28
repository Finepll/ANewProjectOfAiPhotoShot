package com.photoshot.demo.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 下发邮箱验证码请求（F-ACC-01 邮箱通道） */
public record EmailSendCodeRequest(
        @NotBlank(message = "请输入邮箱")
        @Size(max = 254, message = "邮箱长度超出限制")
        String email
) {
}
