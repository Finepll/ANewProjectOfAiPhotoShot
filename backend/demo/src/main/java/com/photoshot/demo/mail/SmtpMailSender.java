package com.photoshot.demo.mail;

import com.photoshot.demo.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

/**
 * SMTP 发信实现（默认按 QQ 邮箱/企业邮的参数配置，其它厂商同样适用）。
 *
 * 超时全部设短：验证码是交互路径上的阻塞调用，宁可快速失败让用户重试，
 * 也不要让请求挂 30 秒。
 */
@Slf4j
public class SmtpMailSender implements MailSender {

    private final AppProperties.Mail cfg;
    private final JavaMailSenderImpl sender;

    public SmtpMailSender(AppProperties properties) {
        this.cfg = properties.getMail();
        this.sender = buildSender(cfg);
    }

    private static JavaMailSenderImpl buildSender(AppProperties.Mail cfg) {
        JavaMailSenderImpl impl = new JavaMailSenderImpl();
        impl.setHost(cfg.getHost());
        impl.setPort(cfg.getPort());
        impl.setUsername(cfg.getUsername());
        impl.setPassword(cfg.getPassword());
        impl.setDefaultEncoding(StandardCharsets.UTF_8.name());

        Properties props = impl.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        if (cfg.isSsl()) {
            props.put("mail.smtp.ssl.enable", "true");
            props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
            props.put("mail.smtp.socketFactory.fallback", "false");
        } else {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }
        props.put("mail.smtp.connectiontimeout", "8000");
        props.put("mail.smtp.timeout", "8000");
        props.put("mail.smtp.writetimeout", "8000");
        return impl;
    }

    @Override
    public void sendCode(String to, String code, int expireMinutes) {
        String from = cfg.getFrom() == null || cfg.getFrom().isBlank() ? cfg.getUsername() : cfg.getFrom();
        if (cfg.getUsername() == null || cfg.getUsername().isBlank()
                || cfg.getPassword() == null || cfg.getPassword().isBlank()) {
            throw new MailSendException("SMTP 账号或授权码未配置", null);
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            // multipart=true：同时设置纯文本与 HTML 两个版本，客户端不支持 HTML 时回退到纯文本
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from, cfg.getFromName());
            helper.setTo(to);
            helper.setSubject("【" + cfg.getFromName() + "】登录验证码 " + code);
            helper.setText(buildText(code, expireMinutes), buildHtml(code, expireMinutes));
            sender.send(message);
            log.info("验证码邮件已投递 provider=smtp to={} codeLen={}", mask(to), code.length());
        } catch (Exception e) {
            log.warn("验证码邮件发送失败 provider=smtp to={} reason={}", mask(to), e.getMessage());
            throw new MailSendException("邮件发送失败：" + e.getMessage(), e);
        }
    }

    @Override
    public String provider() {
        return "smtp";
    }

    private static String buildText(String code, int expireMinutes) {
        return "您的验证码是 " + code + "，" + expireMinutes + " 分钟内有效。\n"
                + "若非本人操作请忽略本邮件，切勿把验证码告诉他人。";
    }

    private static String buildHtml(String code, int expireMinutes) {
        return "<div style=\"font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;"
                + "max-width:480px;margin:0 auto;padding:24px;color:#3E3630;\">"
                + "<h2 style=\"margin:0 0 16px;font-size:18px;\">AI 照相馆</h2>"
                + "<p style=\"margin:0 0 12px;font-size:14px;line-height:1.6;\">您的登录验证码：</p>"
                + "<div style=\"font-size:32px;font-weight:700;letter-spacing:8px;color:#D48982;"
                + "padding:12px 0 16px;\">" + code + "</div>"
                + "<p style=\"margin:0 0 8px;font-size:13px;color:#666;\">" + expireMinutes
                + " 分钟内有效，仅可使用一次。</p>"
                + "<p style=\"margin:0;font-size:13px;color:#666;\">若非本人操作请忽略本邮件，"
                + "切勿把验证码告诉他人。</p>"
                + "</div>";
    }

    /** 日志脱敏：只留首字符与域名 */
    private static String mask(String email) {
        if (email == null) {
            return "";
        }
        int at = email.indexOf('@');
        if (at <= 1) {
            return "***" + (at < 0 ? "" : email.substring(at));
        }
        return email.charAt(0) + "***" + email.substring(at);
    }
}
