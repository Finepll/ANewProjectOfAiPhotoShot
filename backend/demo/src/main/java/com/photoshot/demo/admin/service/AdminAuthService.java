package com.photoshot.demo.admin.service;

import com.photoshot.demo.admin.dao.AdminDao;
import com.photoshot.demo.admin.dao.AdminLogDao;
import com.photoshot.demo.admin.dto.AdminLoginResponse;
import com.photoshot.demo.admin.dto.CreateAdminRequest;
import com.photoshot.demo.admin.entity.SysAdmin;
import com.photoshot.demo.common.BizException;
import com.photoshot.demo.common.ErrorCodes;
import com.photoshot.demo.config.AppProperties;
import com.photoshot.demo.security.AuthContext;
import com.photoshot.demo.security.JwtService;
import com.photoshot.demo.security.LoginUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 后台账号服务（F-ADM-01 登录 / F-ADM-03 管理员与权限 / F-ADM-04 审计留痕）。
 *
 * 【分配制】后台不提供自助注册：
 *  - 账号来源只有两条：① 部署引导配置（AdminBootstrap，见 application.yml 的 app.admin.bootstrap-accounts）；
 *    ② 超级管理员在「管理员与权限」中分配。
 *  - 密码一律 BCrypt 存储；连续失败 5 次锁 30 分钟；被分配的账号首次登录必须改密。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    public static final String ROLE_SUPER_ADMIN = "SUPER_ADMIN";

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AdminDao adminDao;
    private final AdminLogDao adminLogDao;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties properties;

    /** 登录：每一次尝试都写登录日志（成功与失败原因都留痕） */
    @Transactional
    public AdminLoginResponse login(String username, String password, String clientIp, String userAgent) {
        String account = username == null ? "" : username.trim();
        LocalDateTime now = LocalDateTime.now();

        SysAdmin admin = adminDao.findByUsername(account).orElse(null);
        if (admin == null) {
            adminLogDao.insertLoginLog(0L, account, false, "账号不存在", clientIp, userAgent);
            // 不区分「账号不存在」与「密码错误」，避免账号枚举
            throw BizException.of(ErrorCodes.ADMIN_LOGIN_FAIL, "账号或密码不正确");
        }
        if (admin.isLocked()) {
            long minutes = Math.max(1, Duration.between(now, admin.getLockedUntil()).toMinutes() + 1);
            adminLogDao.insertLoginLog(admin.getId(), account, false, "锁定中", clientIp, userAgent);
            throw BizException.of(ErrorCodes.ADMIN_LOCKED, "连续登录失败次数过多，账号已锁定，请 " + minutes + " 分钟后再试");
        }
        if (!passwordEncoder.matches(password == null ? "" : password, admin.getPasswordHash())) {
            int failCount = (admin.getFailCount() == null ? 0 : admin.getFailCount()) + 1;
            int limit = properties.getAdmin().getLogin().getFailLimit();
            LocalDateTime lockedUntil = failCount >= limit
                    ? now.plusMinutes(properties.getAdmin().getLogin().getLockMinutes()) : null;
            adminDao.updateLoginFail(admin.getId(), failCount, lockedUntil, now);
            adminLogDao.insertLoginLog(admin.getId(), account, false, "密码错误", clientIp, userAgent);
            if (lockedUntil != null) {
                throw BizException.of(ErrorCodes.ADMIN_LOCKED, "连续失败 " + limit + " 次，账号已锁定 "
                        + properties.getAdmin().getLogin().getLockMinutes() + " 分钟");
            }
            throw BizException.of(ErrorCodes.ADMIN_LOGIN_FAIL,
                    "账号或密码不正确，还剩余 " + (limit - failCount) + " 次尝试机会");
        }
        if (admin.isDisabled()) {
            adminLogDao.insertLoginLog(admin.getId(), account, false, "账号停用", clientIp, userAgent);
            throw BizException.of(ErrorCodes.ADMIN_DISABLED, "该账号已被停用，请联系超级管理员");
        }

        adminDao.resetFailAndUpdateLogin(admin.getId(), clientIp, now);
        adminLogDao.insertLoginLog(admin.getId(), account, true, "", clientIp, userAgent);

        SysAdmin fresh = adminDao.findById(admin.getId()).orElse(admin);
        String token = jwtService.issueAdminToken(fresh.getId(), fresh.getUsername(), fresh.getRoles());
        log.info("后台登录成功 adminId={} username={} roles={}", fresh.getId(), fresh.getUsername(), fresh.getRoles());
        return buildResponse(token, fresh, admin.getLastLoginAt(), admin.getLastLoginIp());
    }

    /** 当前登录管理员资料（用于刷新页面后恢复身份与权限） */
    public AdminLoginResponse me() {
        LoginUser current = AuthContext.require();
        SysAdmin admin = adminDao.findById(current.id())
                .orElseThrow(() -> BizException.of(ErrorCodes.ADMIN_NOT_FOUND, "账号不存在或已被删除"));
        if (admin.isDisabled()) {
            throw BizException.of(ErrorCodes.ADMIN_DISABLED, "该账号已被停用，请联系超级管理员");
        }
        return buildResponse(null, admin, admin.getLastLoginAt(), admin.getLastLoginIp());
    }

    /** 改密：校验原密码；改完清除「必须改密」标记 */
    @Transactional
    public void changePassword(String oldPassword, String newPassword, String clientIp) {
        LoginUser current = AuthContext.require();
        SysAdmin admin = adminDao.findById(current.id())
                .orElseThrow(() -> BizException.of(ErrorCodes.ADMIN_NOT_FOUND, "账号不存在或已被删除"));
        if (!passwordEncoder.matches(oldPassword == null ? "" : oldPassword, admin.getPasswordHash())) {
            throw BizException.of(ErrorCodes.ADMIN_PASSWORD_WRONG, "原密码不正确");
        }
        if (passwordEncoder.matches(newPassword, admin.getPasswordHash())) {
            throw BizException.of(ErrorCodes.PARAM_INVALID, "新密码不能与原密码相同");
        }
        LocalDateTime now = LocalDateTime.now();
        adminDao.updatePassword(admin.getId(), passwordEncoder.encode(newPassword), true, now);
        adminLogDao.insertOperationLog(admin.getId(), admin.getUsername(), "ADMIN", "CHANGE_PASSWORD",
                String.valueOf(admin.getId()), null, "{\"mustChangePassword\":false}", clientIp);
        log.info("后台改密成功 adminId={}", admin.getId());
    }

    /* ---------------- F-ADM-03 管理员与权限 ---------------- */

    /** 管理员列表（带角色与权限点，供后台「管理员与权限」页展示） */
    public List<SysAdmin> listAdmins() {
        requireSuperAdmin();
        return adminDao.listAll();
    }

    /** 角色下拉 */
    public List<String[]> listRoles() {
        return adminDao.listRoles();
    }

    /** 分配新账号：账号唯一、密码 BCrypt、默认首次登录强制改密 */
    @Transactional
    public SysAdmin createAdmin(CreateAdminRequest request, String clientIp) {
        LoginUser operator = requireSuperAdmin();
        String username = request.username().trim();
        if (adminDao.usernameExists(username)) {
            throw BizException.of(ErrorCodes.ADMIN_USERNAME_EXISTS, "该账号已存在，请更换账号名");
        }
        LocalDateTime now = LocalDateTime.now();
        SysAdmin admin = new SysAdmin();
        admin.setUsername(username);
        admin.setPasswordHash(passwordEncoder.encode(request.password()));
        admin.setRealName(request.realName() == null ? "" : request.realName().trim());
        admin.setPhoneMasked(request.phoneMasked() == null ? "" : request.phoneMasked().trim());
        admin.setEmailMasked(request.emailMasked() == null ? "" : request.emailMasked().trim());
        admin.setStatus(1);
        admin.setMustChangePassword(1);
        admin.setCreatedBy(operator.id());
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        long id = adminDao.insert(admin);
        adminDao.bindRole(id, request.roleCode(), now);
        adminLogDao.insertOperationLog(operator.id(), operator.name(), "ADMIN", "ADMIN_CREATE", String.valueOf(id),
                null, "{\"username\":\"" + username + "\",\"roleCode\":\"" + request.roleCode() + "\"}", clientIp);
        log.info("分配管理员账号 operator={} target={} role={}", operator.name(), username, request.roleCode());
        return adminDao.findById(id).orElse(admin);
    }

    /** 启用 / 停用账号：不能停用自己，也不能停用最后一个可用的超级管理员 */
    @Transactional
    public SysAdmin updateStatus(long adminId, int status, String reason, String clientIp) {
        LoginUser operator = requireSuperAdmin();
        SysAdmin target = adminDao.findById(adminId)
                .orElseThrow(() -> BizException.of(ErrorCodes.ADMIN_NOT_FOUND, "账号不存在"));
        if (adminId == operator.id() && status == 0) {
            throw BizException.of(ErrorCodes.PARAM_INVALID, "不能停用当前登录的账号");
        }
        if (status == 0 && target.getRoles().contains(ROLE_SUPER_ADMIN) && countActiveSuperAdmins() <= 1) {
            throw BizException.of(ErrorCodes.PARAM_INVALID, "系统需保留至少一个启用状态的超级管理员");
        }
        LocalDateTime now = LocalDateTime.now();
        adminDao.updateStatus(adminId, status == 1 ? 1 : 0, now);
        adminLogDao.insertOperationLog(operator.id(), operator.name(), "ADMIN",
                status == 1 ? "ADMIN_ENABLE" : "ADMIN_DISABLE", String.valueOf(adminId),
                "{\"status\":" + target.getStatus() + "}", "{\"status\":" + status + ",\"reason\":\""
                        + (reason == null ? "" : reason.replace("\"", "'")) + "\"}", clientIp);
        log.info("管理员状态变更 operator={} target={} status={}", operator.name(), target.getUsername(), status);
        return adminDao.findById(adminId).orElse(target);
    }

    /** 重置他人密码：重置后强制对方下次登录改密 */
    @Transactional
    public void resetPassword(long adminId, String newPassword, String reason, String clientIp) {
        LoginUser operator = requireSuperAdmin();
        SysAdmin target = adminDao.findById(adminId)
                .orElseThrow(() -> BizException.of(ErrorCodes.ADMIN_NOT_FOUND, "账号不存在"));
        adminDao.updatePassword(adminId, passwordEncoder.encode(newPassword), false, LocalDateTime.now());
        adminLogDao.insertOperationLog(operator.id(), operator.name(), "ADMIN", "ADMIN_RESET_PASSWORD",
                String.valueOf(adminId), null, "{\"username\":\"" + target.getUsername() + "\",\"reason\":\""
                        + (reason == null ? "" : reason.replace("\"", "'")) + "\"}", clientIp);
        log.info("重置管理员密码 operator={} target={}", operator.name(), target.getUsername());
    }

    /* ---------------- F-ADM-04 审计 ---------------- */

    public List<AdminLogDao.LoginLog> loginLogs(int limit) {
        requireSuperAdminOrAuditor();
        return adminLogDao.listLoginLogs(limit);
    }

    public List<AdminLogDao.OperationLog> operationLogs(int limit) {
        requireSuperAdminOrAuditor();
        return adminLogDao.listOperationLogs(limit);
    }

    /** 供其他后台模块写审计用（额度调整、封禁用户等敏感操作必须调用） */
    public void audit(String module, String action, String bizNo, String beforeJson, String afterJson, String clientIp) {
        LoginUser operator = AuthContext.get();
        if (operator == null) {
            return;
        }
        adminLogDao.insertOperationLog(operator.id(), operator.name(), module, action, bizNo, beforeJson, afterJson, clientIp);
    }

    /* ---------------- 内部工具 ---------------- */

    /** 取当前登录管理员，并强制「超级管理员」权限 */
    public LoginUser requireSuperAdmin() {
        LoginUser current = AuthContext.require();
        assertPasswordChanged(current);
        if (!current.isAdmin() || !current.hasRole(ROLE_SUPER_ADMIN)) {
            throw BizException.of(ErrorCodes.NO_PERMISSION, "该操作仅超级管理员可用");
        }
        return current;
    }

    /**
     * 分配制账号的安全闸门：首次登录（或被重置密码后）必须先改密，才能使用后台管理能力。
     * 只靠前端拦截会被绕过，因此这里做一次服务端校验。
     */
    private void assertPasswordChanged(LoginUser current) {
        if (!current.isAdmin()) {
            return;
        }
        adminDao.findById(current.id())
                .filter(SysAdmin::isMustChangePassword)
                .ifPresent(admin -> {
                    throw BizException.of(ErrorCodes.ADMIN_MUST_CHANGE_PASSWORD, "请先修改初始密码后再使用后台功能");
                });
    }

    private void requireSuperAdminOrAuditor() {
        LoginUser current = AuthContext.require();
        assertPasswordChanged(current);
        if (!current.isAdmin() || (!current.hasRole(ROLE_SUPER_ADMIN) && !current.hasRole("AUDITOR"))) {
            throw BizException.of(ErrorCodes.NO_PERMISSION, "该操作需要超级管理员或审计员权限");
        }
    }

    private long countActiveSuperAdmins() {
        return adminDao.listAll().stream()
                .filter(a -> a.getStatus() != null && a.getStatus() == 1)
                .filter(a -> a.getRoles().contains(ROLE_SUPER_ADMIN))
                .count();
    }

    private AdminLoginResponse buildResponse(String token, SysAdmin admin, LocalDateTime lastLoginAt, String lastLoginIp) {
        return new AdminLoginResponse(
                token,
                token == null ? 0 : jwtService.adminTokenTtlSeconds(),
                new AdminLoginResponse.AdminInfo(admin.getId(), admin.getUsername(), admin.getRealName(),
                        admin.getPhoneMasked(), admin.getEmailMasked()),
                admin.getRoles(),
                admin.getPermissions(),
                admin.isMustChangePassword(),
                format(lastLoginAt == null ? admin.getLastLoginAt() : lastLoginAt),
                lastLoginIp == null ? admin.getLastLoginIp() : lastLoginIp
        );
    }

    private String format(LocalDateTime time) {
        return time == null ? null : TIME_FORMAT.format(time);
    }
}
