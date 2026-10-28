package com.photoshot.demo.user.dto;

import java.util.List;

/** 登录响应：JWT + 脱敏用户信息 + 额度 + 已生效协议 */
public record UserLoginResponse(
        String token,
        long expiresInSeconds,
        boolean newUser,
        UserInfo user,
        QuotaInfo quota,
        List<String> signedAgreements,
        /** true=三类协议未全部签署，前端应引导去签署页 */
        boolean needAgreement
) {
    public record UserInfo(long id, String phoneMasked, String emailMasked, String nickname, String registerAt,
                           String lastLoginAt, int loginCount) {
    }

    public record QuotaInfo(int balance, int registerGift) {
    }
}
