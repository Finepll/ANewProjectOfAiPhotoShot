package com.photoshot.demo.admin.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 后台管理员账号（sys_admin，F-ADM-03）。
 * 账号为分配制：系统不提供自助注册，由超管在「管理员与权限」中创建或停用。
 */
@Data
public class SysAdmin {

    private Long id;
    private String username;
    /** BCrypt 哈希，明文只在校验瞬间存在内存中 */
    @JsonIgnore
    private String passwordHash;
    private String realName;
    private String phoneMasked;
    private String emailMasked;
    /** 1启用 0停用 */
    private Integer status;
    /** 1=首次登录必须改密 */
    private Integer mustChangePassword;
    private Integer failCount;
    private LocalDateTime lockedUntil;
    private LocalDateTime lastLoginAt;
    private String lastLoginIp;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 角色码列表（聚合查询填充） */
    private List<String> roles = new ArrayList<>();
    /** 权限点列表（角色权限并集） */
    private List<String> permissions = new ArrayList<>();

    public boolean isDisabled() {
        return status != null && status == 0;
    }

    public boolean isLocked() {
        return lockedUntil != null && lockedUntil.isAfter(LocalDateTime.now());
    }

    public boolean isMustChangePassword() {
        return mustChangePassword != null && mustChangePassword == 1;
    }
}
