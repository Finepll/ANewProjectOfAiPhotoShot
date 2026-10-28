package com.photoshot.demo;

import com.photoshot.demo.support.ApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 合规红线断言：直接查数据库，确认「照片不出本机」的约定没有被表结构破坏。
 */
class ComplianceSchemaTest extends ApiTestBase {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void no_photo_or_face_tables_exist() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_name) IN "
                        + "('file_asset','artwork','ai_task','ai_task_attempt','edit_project','edit_layer',"
                        + "'export_record','face_feature')",
                Integer.class);

        assertThat(count).isZero();
    }

    @Test
    void app_user_stores_hash_and_mask_only() {
        Integer plainPhoneColumn = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns "
                        + "WHERE LOWER(table_name) = 'app_user' AND LOWER(column_name) = 'phone'",
                Integer.class);
        assertThat(plainPhoneColumn).isZero();

        String phone = newPhone();
        loginNewUser(phone);

        String phoneHash = phoneCodec.hashPhone(phone);
        String hash = jdbc.queryForObject(
                "SELECT phone_hash FROM app_user WHERE phone_hash = ?", String.class, phoneHash);
        String masked = jdbc.queryForObject(
                "SELECT phone_masked FROM app_user WHERE phone_hash = ?", String.class, phoneHash);

        assertThat(hash).hasSize(64).doesNotContain(phone);
        assertThat(masked).isNotEqualTo(phone).contains("****");
        assertThat(masked).isEqualTo("139****" + phone.substring(phone.length() - 4));
    }

    @Test
    void admin_password_is_bcrypt_and_sms_code_is_hashed() {
        String passwordHash = jdbc.queryForObject(
                "SELECT password_hash FROM sys_admin WHERE username = 'admin'", String.class);
        assertThat(passwordHash).startsWith("$2");

        String phone = newPhone();
        post("/api/user/auth/code", null, Map.of("phone", phone));

        String codeHash = jdbc.queryForObject(
                "SELECT code_hash FROM app_sms_code ORDER BY id DESC LIMIT 1", String.class);
        assertThat(codeHash).isEqualTo(phoneCodec.sha256("LOGIN|" + phone + "|" + TEST_SMS_CODE));
    }

    @Test
    void jwt_does_not_leak_plaintext_phone() {
        String phone = newPhone();
        String token = loginAndGetToken(phone);

        String payload = new String(java.util.Base64.getUrlDecoder().decode(token.split("\\.")[1]),
                java.nio.charset.StandardCharsets.UTF_8);

        assertThat(payload).doesNotContain(phone);
        assertThat(payload).contains("139****");
    }
}
