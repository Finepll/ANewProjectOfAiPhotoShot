package com.photoshot.demo;

import com.photoshot.demo.support.ApiTestBase;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 管理端集成测试：分配制登录、强制改密闸门、账号分配/停用/重置、审计日志。
 * 所有写操作都使用本用例自己分配的账号，避免污染 admin / ops 两个引导账号。
 */
class AdminAuthApiTest extends ApiTestBase {

    private static final String INIT_PASSWORD = "itpass1234";

    @Test
    void login_failure_then_success_returns_roles_and_resets_fail_count() {
        ApiResponse bad = adminLogin("admin", "wrong-pass");
        assertThat(bad.code()).isEqualTo(30001);
        assertThat(bad.message()).contains("账号或密码不正确");

        ApiResponse ok = adminLogin("admin", "admin123");
        assertThat(ok.code()).isZero();
        assertThat(ok.data().path("admin").path("username").asText()).isEqualTo("admin");
        assertThat(ok.data().path("roles").size()).isEqualTo(1);
        assertThat(ok.data().path("roles").get(0).asText()).isEqualTo("SUPER_ADMIN");
        assertThat(ok.data().path("mustChangePassword").asBoolean()).isFalse();
        assertThat(ok.data().path("expiresInSeconds").asLong()).isEqualTo(12 * 3600);
        assertThat(ok.data().path("token").asText()).isNotBlank();
    }

    @Test
    void admin_list_and_roles_are_available_to_super_admin() {
        String token = superAdminToken();

        JsonNode admins = get("/api/admin/admins", token).data();
        assertThat(admins.size()).isGreaterThanOrEqualTo(2);

        boolean hasOps = false;
        for (JsonNode admin : admins) {
            assertThat(admin.has("passwordHash")).isFalse();
            if ("ops".equals(admin.path("username").asText())) {
                hasOps = true;
            }
        }
        assertThat(hasOps).isTrue();

        JsonNode roles = get("/api/admin/admins/roles", token).data();
        assertThat(roles.size()).isEqualTo(3);
        assertThat(roles.get(0).size()).isEqualTo(2);
    }

    @Test
    void assigned_account_must_change_password_before_using_backend() {
        String superToken = superAdminToken();
        String username = uniqueUsername("itops");
        Map<String, Object> createBody = createAdminBody(username, INIT_PASSWORD, "OPS");

        ApiResponse created = post("/api/admin/admins", superToken, createBody);
        assertThat(created.code()).isZero();
        assertThat(created.data().path("username").asText()).isEqualTo(username);
        assertThat(created.data().path("status").asInt()).isEqualTo(1);
        assertThat(created.data().path("mustChangePassword").asInt()).isEqualTo(1);

        ApiResponse duplicate = post("/api/admin/admins", superToken, createBody);
        assertThat(duplicate.code()).isEqualTo(30004);
        assertThat(duplicate.message()).contains("已存在");

        ApiResponse firstLogin = adminLogin(username, INIT_PASSWORD);
        assertThat(firstLogin.code()).isZero();
        assertThat(firstLogin.data().path("mustChangePassword").asBoolean()).isTrue();
        String token = firstLogin.data().path("token").asText();

        ApiResponse blocked = get("/api/admin/admins", token);
        assertThat(blocked.code()).isEqualTo(30007);
        assertThat(blocked.message()).contains("修改初始密码");

        ApiResponse changed = post("/api/admin/auth/change-password", token,
                Map.of("oldPassword", INIT_PASSWORD, "newPassword", "newpass123"));
        assertThat(changed.code()).isZero();

        ApiResponse relogin = adminLogin(username, "newpass123");
        assertThat(relogin.code()).isZero();
        assertThat(relogin.data().path("mustChangePassword").asBoolean()).isFalse();

        ApiResponse notSuperAdmin = get("/api/admin/admins",
                relogin.data().path("token").asText());
        assertThat(notSuperAdmin.code()).isEqualTo(20003);
        assertThat(notSuperAdmin.message()).contains("超级管理员");
    }

    @Test
    void reset_password_invalidates_old_password_and_forces_change() {
        String superToken = superAdminToken();
        String username = uniqueUsername("itrst");
        post("/api/admin/admins", superToken, createAdminBody(username, INIT_PASSWORD, "OPS"));
        long id = findAdminId(superToken, username);

        ApiResponse reset = post("/api/admin/admins/" + id + "/reset-password", superToken,
                Map.of("newPassword", "reset12345", "reason", "集成测试重置"));
        assertThat(reset.code()).isZero();

        assertThat(adminLogin(username, INIT_PASSWORD).code()).isEqualTo(30001);

        ApiResponse login = adminLogin(username, "reset12345");
        assertThat(login.code()).isZero();
        assertThat(login.data().path("mustChangePassword").asBoolean()).isTrue();
    }

    @Test
    void disabled_account_cannot_login_until_enabled_again() {
        String superToken = superAdminToken();
        String username = uniqueUsername("itdis");
        post("/api/admin/admins", superToken, createAdminBody(username, INIT_PASSWORD, "OPS"));
        long id = findAdminId(superToken, username);

        ApiResponse disabled = put("/api/admin/admins/" + id + "/status", superToken,
                Map.of("status", 0, "reason", "集成测试停用"));
        assertThat(disabled.code()).isZero();
        assertThat(disabled.data().path("status").asInt()).isZero();

        ApiResponse login = adminLogin(username, INIT_PASSWORD);
        assertThat(login.code()).isEqualTo(30002);

        ApiResponse enabled = put("/api/admin/admins/" + id + "/status", superToken,
                Map.of("status", 1, "reason", "集成测试恢复"));
        assertThat(enabled.code()).isZero();
        assertThat(enabled.data().path("status").asInt()).isEqualTo(1);

        assertThat(adminLogin(username, INIT_PASSWORD).code()).isZero();
    }

    @Test
    void super_admin_cannot_disable_itself() {
        String token = superAdminToken();
        long selfId = get("/api/admin/auth/me", token).data().path("admin").path("id").asLong();

        ApiResponse response = put("/api/admin/admins/" + selfId + "/status", token,
                Map.of("status", 0));

        assertThat(response.code()).isEqualTo(10001);
        assertThat(response.message()).contains("不能停用当前登录的账号");
    }

    @Test
    void bootstrap_ops_account_is_gated_by_must_change_password() {
        ApiResponse login = adminLogin("ops", "ops123");
        assertThat(login.code()).isZero();
        assertThat(login.data().path("mustChangePassword").asBoolean()).isTrue();

        ApiResponse response = get("/api/admin/admins", login.data().path("token").asText());
        assertThat(response.code()).isEqualTo(30007);
    }

    @Test
    void weak_password_and_reused_password_are_rejected() {
        String token = superAdminToken();

        ApiResponse weak = post("/api/admin/auth/change-password", token,
                Map.of("oldPassword", "admin123", "newPassword", "abcdefgh"));
        assertThat(weak.code()).isEqualTo(10001);
        assertThat(weak.message()).contains("字母与数字");

        ApiResponse reused = post("/api/admin/auth/change-password", token,
                Map.of("oldPassword", "admin123", "newPassword", "admin123"));
        assertThat(reused.code()).isEqualTo(10001);
        assertThat(reused.message()).contains("不能与原密码相同");
    }

    @Test
    void audit_logs_are_readable_and_record_operations() {
        String token = superAdminToken();
        String username = uniqueUsername("itaud");
        post("/api/admin/admins", token, createAdminBody(username, INIT_PASSWORD, "AUDITOR"));

        JsonNode loginLogs = get("/api/admin/audit/login-logs", token).data();
        assertThat(loginLogs.size()).isGreaterThan(0);
        assertThat(loginLogs.get(0).path("username").asText()).isNotBlank();

        JsonNode operationLogs = get("/api/admin/audit/operation-logs", token).data();
        boolean hasCreate = false;
        for (JsonNode log : operationLogs) {
            if ("ADMIN_CREATE".equals(log.path("action").asText())) {
                hasCreate = true;
            }
        }
        assertThat(hasCreate).isTrue();
    }

    private Map<String, Object> createAdminBody(String username, String password, String roleCode) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("username", username);
        body.put("password", password);
        body.put("realName", "集成测试");
        body.put("phoneMasked", "138****0099");
        body.put("emailMasked", "it***@photoshot.com");
        body.put("roleCode", roleCode);
        return body;
    }
}
