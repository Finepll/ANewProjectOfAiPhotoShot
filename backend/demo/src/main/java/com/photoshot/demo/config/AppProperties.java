package com.photoshot.demo.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * 业务配置（对应 application.yml 的 app.* ）
 */
@Data
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private Phone phone = new Phone();
    private Sms sms = new Sms();
    private Mail mail = new Mail();
    private User user = new User();
    private Admin admin = new Admin();
    private Cors cors = new Cors();

    @Data
    public static class Jwt {
        private String secret;
        private long userTtlMinutes = 10080;
        private long adminTtlMinutes = 720;
    }

    @Data
    public static class Phone {
        /** 手机号哈希密钥：手机号只存 HMAC-SHA256(号码 + 密钥) */
        private String hashSecret;
        private Mask mask = new Mask();

        @Data
        public static class Mask {
            private int keepHead = 3;
            private int keepTail = 4;
        }
    }

    @Data
    public static class Sms {
        /** true=开发/演示：验证码固定且随响应回传；正式环境必须为 false 并接真实短信通道 */
        private boolean devMode = true;
        private String devCode = "888888";
        private int expireSeconds = 300;
        private int resendSeconds = 60;
        /** 同一号码单日下发上限（防刷） */
        private int dailyLimit = 10;
    }

    @Data
    public static class Mail {
        /** smtp=真实发信；log=只记日志不联网（测试/无网环境） */
        private String provider = "log";
        private String host = "smtp.qq.com";
        /** 465=SSL 直连；587=STARTTLS */
        private int port = 465;
        private boolean ssl = true;
        private String username;
        /** SMTP 授权码（不是登录密码），生产从环境变量注入，不进代码库 */
        private String password;
        /** 发件地址，一般与 username 相同 */
        private String from;
        private String fromName = "AI照相馆";
        /** 邮箱验证码有效期（邮件有延迟，比短信长） */
        private int expireMinutes = 10;
        private int resendSeconds = 60;
        private int dailyLimit = 10;
        /** true=固定验证码且随响应回传（仅本地调试）；与 provider 相互独立 */
        private boolean devMode = false;
        private String devCode = "888888";
        /** 邮箱哈希密钥：为空则回退到 app.phone.hash-secret */
        private String hashSecret;
    }

    @Data
    public static class User {
        /** 首次登录（自动注册）赠送的云增强次数 */
        private int registerGiftQuota = 5;
        private String defaultAgreementVersion = "V3.4";
    }

    @Data
    public static class Admin {
        private Login login = new Login();
        /** 分配制账号：系统不提供自助注册，账号由该配置引导创建后由超管分配 */
        private List<BootstrapAccount> bootstrapAccounts = new ArrayList<>();

        @Data
        public static class Login {
            private int failLimit = 5;
            private int lockMinutes = 30;
        }

        @Data
        public static class BootstrapAccount {
            private String username;
            private String password;
            private String realName = "";
            private String phoneMasked = "";
            private String emailMasked = "";
            private String roleCode = "OPS";
            private boolean mustChangePassword = true;
        }
    }

    @Data
    public static class Cors {
        private String allowedOrigins = "http://localhost:5173,http://127.0.0.1:5173";
    }
}
