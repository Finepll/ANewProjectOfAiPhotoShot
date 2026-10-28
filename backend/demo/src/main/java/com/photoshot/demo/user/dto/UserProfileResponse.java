package com.photoshot.demo.user.dto;

import com.photoshot.demo.user.entity.PrivacySetting;
import com.photoshot.demo.user.entity.UserConsent;

import java.util.List;

/** 当前登录用户资料（我的页面） */
public record UserProfileResponse(
        long id,
        String phoneMasked,
        String emailMasked,
        String nickname,
        int status,
        String registerAt,
        String lastLoginAt,
        int loginCount,
        int quotaBalance,
        PrivacySetting privacy,
        List<ConsentView> consents
) {
    public record ConsentView(String code, String name, String version, boolean effective,
                              String signedAt, String signHash) {
        public static ConsentView of(UserConsent consent, String name) {
            if (consent == null) {
                return new ConsentView(null, name, null, false, null, null);
            }
            return new ConsentView(consent.getAgreementCode(), name, consent.getAgreementVersion(),
                    consent.getStatus() != null && consent.getStatus() == 1,
                    String.valueOf(consent.getSignedAt()), consent.getSignHash());
        }
    }
}
