package com.photoshot.demo.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/** 登录 / 自动注册请求（F-ACC-01 + F-ACC-02 协议一并签署） */
public record UserLoginRequest(
        @NotBlank(message = "请输入手机号")
        @Pattern(regexp = "^1[3-9]\\d{9}$", message = "请输入正确的 11 位手机号")
        String phone,

        @NotBlank(message = "请输入验证码")
        String code,

        /** 设备标识，用于协议存证与风控（不采集任何生物特征） */
        String deviceId,

        /** 注册来源：MINIPROGRAM / H5 */
        String registerSource,

        /** 勾选的协议列表；未勾选肖像权授权则拍摄/导出入口不可用 */
        @Valid List<AgreementItem> agreements
) {
    public record AgreementItem(String code, String version) {
    }
}
