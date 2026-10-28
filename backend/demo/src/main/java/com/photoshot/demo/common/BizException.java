package com.photoshot.demo.common;

import lombok.Getter;

/**
 * 业务异常：只携带可展示给用户的文案，不携带堆栈细节与任何敏感数据。
 */
@Getter
public class BizException extends RuntimeException {

    private final int code;

    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }

    public static BizException of(int code, String message) {
        return new BizException(code, message);
    }
}
