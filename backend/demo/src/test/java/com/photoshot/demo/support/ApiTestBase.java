package com.photoshot.demo.support;

import com.photoshot.demo.user.dao.SmsCodeDao;
import com.photoshot.demo.user.service.PhoneCodec;
import com.photoshot.demo.user.service.EmailCodec;
import com.photoshot.demo.user.service.SmsCodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 集成测试基类：真实起服务（随机端口）+ 真实 H2 数据库 + 真实 HTTP 调用。
 *
 * 隔离策略：每个测试类通过 {@link DynamicPropertySource} 拿到一个独立的内存库，
 * 因此类与类之间不会互相污染，也不需要手工清库。
 *
 * 注意：H2 的建表脚本会执行 15 张表 + 种子数据，管理员由 AdminBootstrap 创建。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("h2")
public abstract class ApiTestBase {

    /** 开发模式下固定的验证码 */
    protected static final String TEST_SMS_CODE = "888888";

    private static final AtomicInteger PHONE_SEQ = new AtomicInteger(2000);

    private final HttpClient http = HttpClient.newHttpClient();

    @LocalServerPort
    protected int port;

    @Autowired
    protected ObjectMapper json;

    @Autowired
    protected SmsCodeDao smsCodeDao;

    @Autowired
    protected PhoneCodec phoneCodec;

    @Autowired
    protected EmailCodec emailCodec;

    /** 每个测试类一个独立内存库，避免类之间数据串味 */
    @DynamicPropertySource
    static void freshDatabase(DynamicPropertyRegistry registry) {
        String db = "it_" + UUID.randomUUID().toString().replace("-", "");
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:" + db
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;CASE_INSENSITIVE_IDENTIFIERS=TRUE;DB_CLOSE_DELAY=-1");
    }

    /* ---------------- HTTP ---------------- */

    protected record ApiResponse(int status, JsonNode body) {
        public int code() {
            return body.path("code").asInt(-1);
        }

        public String message() {
            return body.path("message").asText("");
        }

        public JsonNode data() {
            return body.path("data");
        }
    }

    protected ApiResponse get(String path, String token) {
        return send("GET", path, token, null);
    }

    protected ApiResponse post(String path, String token, Object body) {
        return send("POST", path, token, body);
    }

    protected ApiResponse put(String path, String token, Object body) {
        return send("PUT", path, token, body);
    }

    private ApiResponse send(String method, String path, String token, Object body) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                    .header("Accept", "application/json");
            if (token != null) {
                builder.header("Authorization", "Bearer " + token);
            }
            if (body == null) {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            } else {
                builder.header("Content-Type", "application/json");
                builder.method(method, HttpRequest.BodyPublishers.ofString(
                        json.writeValueAsString(body), StandardCharsets.UTF_8));
            }
            HttpResponse<String> response = http.send(builder.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JsonNode node = response.body() == null || response.body().isBlank()
                    ? json.createObjectNode()
                    : json.readTree(response.body());
            return new ApiResponse(response.statusCode(), node);
        } catch (Exception e) {
            throw new IllegalStateException(method + " " + path + " 调用失败", e);
        }
    }

    /* ---------------- 业务小工具 ---------------- */

    /** 生成唯一手机号：139 + 8 位序号（满足 ^1[3-9]\\d{9}$） */
    protected String newPhone() {
        return "139" + String.format("%08d", PHONE_SEQ.incrementAndGet());
    }

    /** 生成唯一管理员账号（3~32 位字母数字） */
    protected String uniqueUsername(String prefix) {
        return prefix + (System.nanoTime() % 100000);
    }

    /**
     * 直接写一条"已过频控期"的验证码记录，用于需要重复登录同一个号码的用例。
     * 走真实哈希规则，等价于 61 秒前下发过一次。
     */
    protected void issueCodeDirectly(String phone) {
        LocalDateTime now = LocalDateTime.now();
        smsCodeDao.insert(
                phoneCodec.hashPhone(phone),
                SmsCodeService.SCENE_LOGIN,
                phoneCodec.sha256(SmsCodeService.SCENE_LOGIN + "|" + phone + "|" + TEST_SMS_CODE),
                now.plusMinutes(5),
                "it-test",
                now.minusSeconds(61));
    }

    protected List<Map<String, String>> allAgreements() {
        return List.of(
                Map.of("code", "PORTRAIT", "version", "V3.4"),
                Map.of("code", "PRIVACY", "version", "V3.4"),
                Map.of("code", "SERVICE", "version", "V3.4"));
    }

    protected Map<String, Object> loginBody(String phone) {
        return Map.of(
                "phone", phone,
                "code", TEST_SMS_CODE,
                "deviceId", "it-device-001",
                "registerSource", "MINIPROGRAM",
                "agreements", allAgreements());
    }

    /** 下发验证码 + 登录（自动注册） */
    protected ApiResponse loginNewUser(String phone) {
        post("/api/user/auth/code", null, Map.of("phone", phone));
        return post("/api/user/auth/login", null, loginBody(phone));
    }

    protected String loginAndGetToken(String phone) {
        ApiResponse response = loginNewUser(phone);
        if (response.code() != 0) {
            throw new IllegalStateException("登录失败：" + response.body());
        }
        return response.data().path("token").asText();
    }

    protected ApiResponse adminLogin(String username, String password) {
        return post("/api/admin/auth/login", null, Map.of("username", username, "password", password));
    }

    protected String superAdminToken() {
        ApiResponse response = adminLogin("admin", "admin123");
        if (response.code() != 0) {
            throw new IllegalStateException("超管登录失败：" + response.body());
        }
        return response.data().path("token").asText();
    }

    /** 从 me/consents 数组里按协议码取一项 */
    protected JsonNode findConsent(JsonNode consents, String code) {
        for (JsonNode node : consents) {
            if (code.equals(node.path("code").asText())) {
                return node;
            }
        }
        return null;
    }

    /** 按账号名从管理员列表里取 ID */
    protected long findAdminId(String token, String username) {
        for (JsonNode node : get("/api/admin/admins", token).data()) {
            if (username.equals(node.path("username").asText())) {
                return node.path("id").asLong();
            }
        }
        throw new IllegalStateException("管理员不存在：" + username);
    }
}
