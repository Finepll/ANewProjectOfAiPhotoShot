package com.photoshot.demo.common;

import lombok.Data;

/**
 * 统一响应体：前端（管理后台 / 小程序）按 code 判断成功与失败，message 直接可展示。
 */
@Data
public class ApiResult<T> {

    /** 0 = 成功；其余为业务错误码（见 ErrorCodes） */
    private int code;
    private String message;
    private T data;
    private long timestamp = System.currentTimeMillis();

    public static <T> ApiResult<T> ok(T data) {
        ApiResult<T> result = new ApiResult<>();
        result.code = ErrorCodes.OK;
        result.message = "ok";
        result.data = data;
        return result;
    }

    public static <T> ApiResult<T> ok() {
        return ok(null);
    }

    public static <T> ApiResult<T> fail(int code, String message) {
        ApiResult<T> result = new ApiResult<>();
        result.code = code;
        result.message = message;
        return result;
    }
}
