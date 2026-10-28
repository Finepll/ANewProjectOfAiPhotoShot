package com.photoshot.demo.admin.service;

import com.photoshot.demo.admin.dao.AdminDao;
import com.photoshot.demo.admin.entity.SysAdmin;
import com.photoshot.demo.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 管理员账号引导（F-ADM-03「分配制」的落地方式）。
 *
 * 后台不提供自助注册，账号只能来自两条路径：
 *  1) 部署引导：本类在启动时按 application.yml 的 app.admin.bootstrap-accounts 逐条创建（密码 BCrypt 入库）；
 *  2) 超管分配：登录后在「管理员与权限」页创建，见 AdminAuthService#createAdmin。
 * 已存在的账号不会被覆盖（不会把线上密码重置回配置值）。
 * 【合规】日志只打印账号名，绝不打印密码。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {

    private final AdminDao adminDao;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;

    @Override
    public void run(ApplicationArguments args) {
        for (AppProperties.Admin.BootstrapAccount account : properties.getAdmin().getBootstrapAccounts()) {
            if (account.getUsername() == null || account.getUsername().isBlank()) {
                continue;
            }
            try {
                bootstrapOne(account);
            } catch (Exception e) {
                log.warn("管理员引导账号创建失败 username={} reason={}", account.getUsername(), e.getMessage());
            }
        }
    }

    private void bootstrapOne(AppProperties.Admin.BootstrapAccount account) {
        if (adminDao.findByUsername(account.getUsername()).isPresent()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        SysAdmin admin = new SysAdmin();
        admin.setUsername(account.getUsername());
        admin.setPasswordHash(passwordEncoder.encode(account.getPassword()));
        admin.setRealName(account.getRealName());
        admin.setPhoneMasked(account.getPhoneMasked());
        admin.setEmailMasked(account.getEmailMasked());
        admin.setStatus(1);
        admin.setMustChangePassword(account.isMustChangePassword() ? 1 : 0);
        admin.setCreatedBy(0L);
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        long id = adminDao.insert(admin);
        adminDao.bindRole(id, account.getRoleCode(), now);
        log.info("已创建引导管理员账号 username={} role={} mustChangePassword={}",
                account.getUsername(), account.getRoleCode(), account.isMustChangePassword());
    }
}
