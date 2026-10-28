package com.photoshot.demo.mail;

/** 邮件发送失败（网络、认证、被拒收等），由调用方转成业务错误码 20016 */
public class MailSendException extends RuntimeException {

    public MailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}
