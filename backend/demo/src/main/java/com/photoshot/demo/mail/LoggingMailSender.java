package com.photoshot.demo.mail;

import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 本地/测试用的空实现：不联网，只记录最后一次投递内容。
 *
 * 存在的意义有两个：
 *  1. 没有 SMTP 授权时也能跑通整条登录链路；
 *  2. 集成测试需要拿到「服务端实际生成并发送的验证码」，否则只能读数据库反推。
 */
@Slf4j
public class LoggingMailSender implements MailSender {

    private final AtomicReference<String> lastTo = new AtomicReference<>();
    private final AtomicReference<String> lastCode = new AtomicReference<>();
    private final AtomicBoolean failNext = new AtomicBoolean(false);

    @Override
    public void sendCode(String to, String code, int expireMinutes) {
        if (failNext.compareAndSet(true, false)) {
            throw new MailSendException("模拟发送失败", null);
        }
        lastTo.set(to);
        lastCode.set(code);
        log.info("邮件通道为 log，未真实发送 to={} codeLen={} expireMinutes={}", to, code.length(), expireMinutes);
    }

    @Override
    public String provider() {
        return "log";
    }

    public String lastTo() {
        return lastTo.get();
    }

    public String lastCode() {
        return lastCode.get();
    }

    /** 让下一次发送失败，用于验证「发送失败必须回滚验证码记录」 */
    public void failNext() {
        failNext.set(true);
    }
}
