package com.photoshot.demo.security;

import tools.jackson.databind.ObjectMapper;
import com.photoshot.demo.common.ApiResult;
import com.photoshot.demo.common.BizException;
import com.photoshot.demo.common.ErrorCodes;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;

/**
 * 登录态拦截器：
 *  - /api/admin/** 需要管理端令牌；
 *  - /api/user/** 需要 C 端令牌（白名单见 WebConfig）。
 * 鉴权失败统一返回 ApiResult JSON，前端按 code 跳登录。
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        boolean adminApi = path.startsWith("/api/admin/");
        try {
            String token = resolveToken(request);
            if (token == null) {
                throw BizException.of(ErrorCodes.UNAUTHORIZED, "请先登录");
            }
            LoginUser loginUser = jwtService.parse(token);
            if (adminApi && !loginUser.isAdmin()) {
                throw BizException.of(ErrorCodes.NO_PERMISSION, "请使用管理员账号登录后台");
            }
            if (!adminApi && loginUser.isAdmin()) {
                throw BizException.of(ErrorCodes.NO_PERMISSION, "请使用用户端登录态访问该接口");
            }
            AuthContext.set(loginUser);
            return true;
        } catch (BizException e) {
            writeJson(response, HttpServletResponse.SC_UNAUTHORIZED, ApiResult.fail(e.getCode(), e.getMessage()));
            return false;
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        AuthContext.clear();
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader(HEADER);
        if (header != null && header.startsWith(PREFIX)) {
            String token = header.substring(PREFIX.length()).trim();
            return token.isEmpty() ? null : token;
        }
        return null;
    }

    private void writeJson(HttpServletResponse response, int status, ApiResult<?> body) throws Exception {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
