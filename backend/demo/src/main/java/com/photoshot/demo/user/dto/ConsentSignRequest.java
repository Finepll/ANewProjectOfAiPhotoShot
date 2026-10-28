package com.photoshot.demo.user.dto;

import jakarta.validation.constraints.NotBlank;

/** 协议签署 / 撤回请求（F-ACC-02） */
public record ConsentSignRequest(
        @NotBlank(message = "请指定协议类型")
        String code,
        String version,
        String deviceId,
        /** 撤回时填写原因（选填） */
        String reason
) {
}
