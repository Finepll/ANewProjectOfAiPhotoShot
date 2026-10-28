package com.photoshot.demo.admin.controller;

import com.photoshot.demo.admin.dto.AdminLoginRequest;
import com.photoshot.demo.admin.dto.AdminLoginResponse;
import com.photoshot.demo.admin.dto.ChangePasswordRequest;
import com.photoshot.demo.admin.service.AdminAuthService;
import com.photoshot.demo.common.ApiResult;
import com.photoshot.demo.common.WebUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 后台登录接口（F-ADM-01）。
 * 明确不提供注册接口：账号为分配制，由超管或部署配置创建。
 */
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    /** 账号密码登录（白名单接口）：失败 5 次锁 30 分钟 */
    @PostMapping("/login")
    public ApiResult<AdminLoginResponse> login(@Valid @RequestBody AdminLoginRequest request, HttpServletRequest http) {
        return ApiResult.ok(adminAuthService.login(request.username(), request.password(),
                WebUtils.clientIp(http), WebUtils.userAgent(http)));
    }

    /** 当前登录管理员资料与权限（刷新页面后恢复登录态用） */
    @GetMapping("/me")
    public ApiResult<AdminLoginResponse> me() {
        return ApiResult.ok(adminAuthService.me());
    }

    /** 修改密码（首次登录强制改密也走这里） */
    @PostMapping("/change-password")
    public ApiResult<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request, HttpServletRequest http) {
        adminAuthService.changePassword(request.oldPassword(), request.newPassword(), WebUtils.clientIp(http));
        return ApiResult.ok();
    }

    /** 退出登录：JWT 无状态，端上清除令牌即可 */
    @PostMapping("/logout")
    public ApiResult<Void> logout() {
        return ApiResult.ok();
    }
}
