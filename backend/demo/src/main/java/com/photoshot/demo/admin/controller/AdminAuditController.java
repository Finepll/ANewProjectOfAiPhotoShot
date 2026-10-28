package com.photoshot.demo.admin.controller;

import com.photoshot.demo.admin.dao.AdminLogDao;
import com.photoshot.demo.admin.service.AdminAuthService;
import com.photoshot.demo.common.ApiResult;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 审计查询（F-ADM-04）：登录日志与操作日志只读，后台不提供修改与删除入口。 */
@RestController
@RequestMapping("/api/admin/audit")
@RequiredArgsConstructor
public class AdminAuditController {

    private final AdminAuthService adminAuthService;

    /** 管理员登录日志（含失败原因，异常登录可追溯） */
    @GetMapping("/login-logs")
    public ApiResult<List<AdminLogDao.LoginLog>> loginLogs(@RequestParam(defaultValue = "50") int limit) {
        return ApiResult.ok(adminAuthService.loginLogs(limit));
    }

    /** 操作审计日志（敏感操作留痕） */
    @GetMapping("/operation-logs")
    public ApiResult<List<AdminLogDao.OperationLog>> operationLogs(@RequestParam(defaultValue = "50") int limit) {
        return ApiResult.ok(adminAuthService.operationLogs(limit));
    }
}
