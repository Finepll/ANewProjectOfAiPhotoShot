package com.photoshot.demo.security;

import java.util.List;

/**
 * 当前登录主体：C 端用户或后台管理员。
 *
 * @param type     USER / ADMIN
 * @param id       用户 id 或管理员 id
 * @param name     展示名（用户为手机号掩码，管理员为账号）
 * @param roles    管理员角色码列表；C 端为空
 */
public record LoginUser(String type, long id, String name, List<String> roles) {

    public static final String TYPE_USER = "USER";
    public static final String TYPE_ADMIN = "ADMIN";

    public boolean isAdmin() {
        return TYPE_ADMIN.equals(type);
    }

    public boolean hasRole(String roleCode) {
        return roles != null && roles.contains(roleCode);
    }
}
