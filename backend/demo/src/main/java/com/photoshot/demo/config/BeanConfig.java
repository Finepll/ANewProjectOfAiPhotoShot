package com.photoshot.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** 基础 Bean 装配 */
@Configuration
public class BeanConfig {

    /**
     * 后台密码使用 BCrypt 加盐哈希（F-SRV-01 / FR-A-01），
     * 只引入 spring-security-crypto，不启用完整 Spring Security 过滤器链。
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
