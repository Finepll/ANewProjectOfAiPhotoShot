package com.photoshot.demo.admin.controller;

import com.photoshot.demo.admin.dto.CreateAdminRequest;
import com.photoshot.demo.admin.dto.ResetPasswordRequest;
import com.photoshot.demo.admin.dto.UpdateAdminStatusRequest;
import com.photoshot.demo.admin.entity.SysAdmin;
import com.photoshot.demo.admin.service.AdminAuthService;
import com.photoshot.demo.common.ApiResult;
import com.photoshot.demo.common.WebUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 管理员与权限（F-ADM-03）。
 * 全部接口都需要「超级管理员」角色：账号是分配制，分配权不外放。
 */
@RestController
@RequestMapping("/api/admin/admins")
@RequiredArgsConstructor
public class AdminManageController {

    private final AdminAuthService adminAuthService;

    /** 管理员列表（含角色、权限点、锁定与停用状态） */
    @GetMapping
    public ApiResult<List<SysAdmin>> list() {
        return ApiResult.ok(adminAuthService.listAdmins());
    }

    /** 角色下拉（分配账号时选择） */
    @GetMapping("/roles")
    public ApiResult<List<String[]>> roles() {
        return ApiResult.ok(adminAuthService.listRoles());
    }

    /** 分配新账号：密码为初始密码，对方首次登录必须修改 */
    @PostMapping
    public ApiResult<SysAdmin> create(@Valid @RequestBody CreateAdminRequest request, HttpServletRequest http) {
        return ApiResult.ok(adminAuthService.createAdmin(request, WebUtils.clientIp(http)));
    }

    /** 启用 / 停用账号 */
    @PutMapping("/{id}/status")
    public ApiResult<SysAdmin> updateStatus(@PathVariable long id,
                                            @Valid @RequestBody UpdateAdminStatusRequest request,
                                            HttpServletRequest http) {
        return ApiResult.ok(adminAuthService.updateStatus(id, request.status(), request.reason(),
                WebUtils.clientIp(http)));
    }

    /** 重置他人密码（重置后对方下次登录强制改密） */
    @PostMapping("/{id}/reset-password")
    public ApiResult<Void> resetPassword(@PathVariable long id,
                                         @Valid @RequestBody ResetPasswordRequest request,
                                         HttpServletRequest http) {
        adminAuthService.resetPassword(id, request.newPassword(), request.reason(), WebUtils.clientIp(http));
        return ApiResult.ok();
    }
}
