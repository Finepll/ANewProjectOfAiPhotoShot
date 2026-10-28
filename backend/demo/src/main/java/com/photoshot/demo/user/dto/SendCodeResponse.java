package com.photoshot.demo.user.dto;

/**
 * 下发验证码响应。
 * devCode 仅在开发/演示模式（app.sms.dev-mode=true）返回，正式环境为 null。
 */
public record SendCodeResponse(String devCode, int expireSeconds, int resendAfterSeconds, String message) {
}
