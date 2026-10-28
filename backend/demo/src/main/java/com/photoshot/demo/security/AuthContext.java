package com.photoshot.demo.security;

import com.photoshot.demo.common.BizException;
import com.photoshot.demo.common.ErrorCodes;

/**
 * 当前请求的登录主体（ThreadLocal），由 AuthInterceptor 写入与清理。
 */
public final class AuthContext {

    private static final ThreadLocal<LoginUser> CURRENT = new ThreadLocal<>();

    private AuthContext() {
    }

    public static void set(LoginUser user) {
        CURRENT.set(user);
    }

    public static LoginUser get() {
        return CURRENT.get();
    }

    /** 取当前登录主体；未登录直接抛 401 */
    public static LoginUser require() {
        LoginUser user = CURRENT.get();
        if (user == null) {
            throw BizException.of(ErrorCodes.UNAUTHORIZED, "登录态已失效，请重新登录");
        }
        return user;
    }

    /** 取当前登录的 C 端用户 id */
    public static long requireUserId() {
        LoginUser user = require();
        if (user.isAdmin()) {
            throw BizException.of(ErrorCodes.UNAUTHORIZED, "请使用用户端登录态访问该接口");
        }
        return user.id();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
