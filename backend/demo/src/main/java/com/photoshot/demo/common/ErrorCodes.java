package com.photoshot.demo.common;

/**
 * 业务错误码。
 * 约定：1xxxx 通用 / 2xxxx 账号鉴权 / 3xxxx 后台管理 / 4xxxx 额度与支付 / 5xxxx 云增强
 */
public final class ErrorCodes {

    public static final int OK = 0;

    /* 通用 */
    public static final int PARAM_INVALID = 10001;
    public static final int INTERNAL_ERROR = 10002;

    /* 账号与鉴权（F-SRV-01 / F-ACC-01） */
    public static final int UNAUTHORIZED = 20001;
    public static final int TOKEN_EXPIRED = 20002;
    public static final int NO_PERMISSION = 20003;
    public static final int PHONE_INVALID = 20010;
    public static final int SMS_TOO_FREQUENT = 20011;
    public static final int SMS_DAILY_LIMIT = 20012;
    public static final int SMS_CODE_INVALID = 20013;
    public static final int SMS_CODE_EXPIRED = 20014;
    public static final int USER_BANNED = 20015;

    /* 邮箱验证码（F-ACC-01 邮箱通道） */
    public static final int EMAIL_INVALID = 20020;
    public static final int MAIL_TOO_FREQUENT = 20021;
    public static final int MAIL_DAILY_LIMIT = 20022;
    public static final int MAIL_CODE_INVALID = 20023;
    public static final int MAIL_CODE_EXPIRED = 20024;
    public static final int MAIL_SEND_FAIL = 20025;

    /* 后台管理（F-ADM-03） */
    public static final int ADMIN_LOGIN_FAIL = 30001;
    public static final int ADMIN_DISABLED = 30002;
    public static final int ADMIN_LOCKED = 30003;
    public static final int ADMIN_USERNAME_EXISTS = 30004;
    public static final int ADMIN_NOT_FOUND = 30005;
    public static final int ADMIN_PASSWORD_WRONG = 30006;
    public static final int ADMIN_MUST_CHANGE_PASSWORD = 30007;

    /* 额度与支付（F-SRV-03 / F-SRV-05） */
    public static final int QUOTA_NOT_ENOUGH = 40001;
    public static final int IDEMPOTENT_CONFLICT = 40002;

    /* 云增强（F-CLD-01） */
    public static final int CLOUD_TASK_BUSY = 50001;
    public static final int CLOUD_NOT_AUTHORIZED = 50002;

    private ErrorCodes() {
    }
}
