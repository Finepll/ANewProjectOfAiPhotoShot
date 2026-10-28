package com.photoshot.demo.admin.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** 启用 / 停用管理员账号（F-ADM-03） */
public record UpdateAdminStatusRequest(
        @Min(value = 0, message = "状态值不合法")
        @Max(value = 1, message = "状态值不合法")
        int status,
        String reason
) {
}
