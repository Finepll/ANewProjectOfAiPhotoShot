package com.photoshot.demo.mail;

/**
 * 邮件发送通道（当前只用于登录验证码）。
 *
 * 设计约定：
 *  - 接口只暴露「发验证码」这一件事，避免被当成通用营销通道；
 *  - 实现抛 {@link MailSendException} 表示发送失败，调用方必须回滚验证码记录，
 *    否则用户既没收到码、又占掉了频控额度。
 */
public interface MailSender {

    void sendCode(String to, String code, int expireMinutes);

    /** 通道标识，写入日志便于排查（smtp / log） */
    String provider();
}
