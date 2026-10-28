package com.photoshot.demo.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/** 邮箱登录 / 自动注册请求（与手机号登录等价，协议一并签署） */
public record EmailLoginRequest(
        @NotBlank(message = "请输入邮箱")
        @Size(max = 254, message = "邮箱长度超出限制")
        String email,

        @NotBlank(message = "请输入验证码")
        String code,

        /** 设备标识，用于协议存证与风控（不采集任何生物特征） */
        String deviceId,

        /** 注册来源：MINIPROGRAM / H5 */
        String registerSource,

        @Valid List<UserLoginRequest.AgreementItem> agreements
) {
}
