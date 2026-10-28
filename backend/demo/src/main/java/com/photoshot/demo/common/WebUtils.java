package com.photoshot.demo.common;

import jakarta.servlet.http.HttpServletRequest;

/** 请求相关的工具方法 */
public final class WebUtils {

    private WebUtils() {
    }

    /** 取客户端 IP（兼容反向代理），日志与登录留痕用 */
    public static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String[] headers = {"X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP"};
        for (String header : headers) {
            String value = request.getHeader(header);
            if (value != null && !value.isBlank() && !"unknown".equalsIgnoreCase(value)) {
                int comma = value.indexOf(',');
                return comma > 0 ? value.substring(0, comma).trim() : value.trim();
            }
        }
        return request.getRemoteAddr();
    }

    public static String userAgent(HttpServletRequest request) {
        String ua = request == null ? null : request.getHeader("User-Agent");
        if (ua == null) {
            return "";
        }
        return ua.length() > 300 ? ua.substring(0, 300) : ua;
    }
}
