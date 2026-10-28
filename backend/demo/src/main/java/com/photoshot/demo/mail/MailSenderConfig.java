package com.photoshot.demo.mail;

import com.photoshot.demo.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 邮件通道装配：app.mail.provider=smtp 走真实 SMTP，其余（含缺省）走日志实现。
 * 用两家互斥的 @ConditionalOnProperty，避免 @ConditionalOnMissingBean 的装配顺序坑。
 */
@Slf4j
@Configuration
public class MailSenderConfig {

    @Bean
    @ConditionalOnProperty(name = "app.mail.provider", havingValue = "smtp")
    public MailSender smtpMailSender(AppProperties properties) {
        AppProperties.Mail cfg = properties.getMail();
        log.info("邮件通道已启用 provider=smtp host={} port={} ssl={} from={}",
                cfg.getHost(), cfg.getPort(), cfg.isSsl(), cfg.getFrom());
        return new SmtpMailSender(properties);
    }

    @Bean
    @ConditionalOnProperty(name = "app.mail.provider", havingValue = "log", matchIfMissing = true)
    public MailSender loggingMailSender() {
        log.warn("邮件通道为 log 模式：不会真实发信，仅用于本地调试与测试");
        return new LoggingMailSender();
    }
}
