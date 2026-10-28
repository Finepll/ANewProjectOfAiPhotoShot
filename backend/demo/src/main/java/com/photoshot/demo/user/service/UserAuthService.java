package com.photoshot.demo.user.service;

import com.photoshot.demo.common.BizException;
import com.photoshot.demo.common.ErrorCodes;
import com.photoshot.demo.config.AppProperties;
import com.photoshot.demo.security.JwtService;
import com.photoshot.demo.user.dao.AppUserDao;
import com.photoshot.demo.user.dto.EmailLoginRequest;
import com.photoshot.demo.user.dto.UserLoginRequest;
import com.photoshot.demo.user.dto.UserLoginResponse;
import com.photoshot.demo.user.dto.UserProfileResponse;
import com.photoshot.demo.user.entity.AppUser;
import com.photoshot.demo.user.entity.PrivacySetting;
import com.photoshot.demo.user.entity.UserConsent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * C 端账号服务（F-ACC-01 验证码登录 / 未注册自动注册，F-ACC-02 协议存证，F-ACC-03 隐私开关）。
 *
 * 登录通道有两条，后续逻辑完全共用：
 *  - 手机号 + 短信验证码（SMS，通道未接时为 dev 模式）
 *  - 邮箱 + 邮件验证码（SMTP）
 *
 * 【合规】
 *  - 手机号/邮箱只落 hash + masked，明文只在本次请求内存中出现；
 *  - 登录不采集人脸、不上传图片，也不写任何人脸特征；
 *  - 每次登录的留痕只有 IP、UA、时间与协议指纹。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserAuthService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String SOURCE_DEFAULT = "MINIPROGRAM";

    private final AppUserDao appUserDao;
    private final PhoneCodec phoneCodec;
    private final EmailCodec emailCodec;
    private final SmsCodeService smsCodeService;
    private final EmailCodeService emailCodeService;
    private final ConsentService consentService;
    private final QuotaService quotaService;
    private final com.photoshot.demo.user.dao.PrivacyDao privacyDao;
    private final JwtService jwtService;
    private final AppProperties properties;

    /**
     * 手机号登录（未注册则自动注册）。
     *
     * @param clientIp 客户端 IP（留痕用，不参与风控决策之外的用途）
     */
    @Transactional
    public UserLoginResponse login(UserLoginRequest request, String clientIp) {
        // 1) 校验并消费验证码（幂等：同一条验证码只能通过一次）
        smsCodeService.verifyAndConsume(request.phone(), request.code(), SmsCodeService.SCENE_LOGIN);

        // 2) 查账号 / 首次登录即注册
        String phoneHash = phoneCodec.hashPhone(request.phone());
        LocalDateTime now = LocalDateTime.now();
        Optional<AppUser> existing = appUserDao.findByPhoneHash(phoneHash);
        boolean newUser = existing.isEmpty();
        AppUser user;
        if (newUser) {
            user = newUserEntity(now, clientIp, normalizeSource(request.registerSource()));
            user.setPhoneHash(phoneHash);
            user.setPhoneMasked(phoneCodec.maskPhone(request.phone()));
            // 昵称不带手机号片段以外的一切信息；尾 4 位已经是掩码可见部分
            user.setNickname("影友" + tailOf(request.phone()));
            user.setId(appUserDao.insert(user));
            log.info("C 端账号自动注册 userId={} source={} channel=PHONE", user.getId(), user.getRegisterSource());
        } else {
            user = existing.get();
        }

        return completeLogin(user, newUser, request.agreements(), request.deviceId(), clientIp);
    }

    /**
     * 邮箱登录（未注册则自动注册）。
     * 与手机号登录共享封禁校验、隐私初始化、协议存证、赠送额度与令牌签发。
     */
    @Transactional
    public UserLoginResponse loginByEmail(EmailLoginRequest request, String clientIp) {
        emailCodeService.verifyAndConsume(request.email(), request.code(), EmailCodeService.SCENE_LOGIN);

        String emailHash = emailCodec.hash(request.email());
        LocalDateTime now = LocalDateTime.now();
        Optional<AppUser> existing = appUserDao.findByEmailHash(emailHash);
        boolean newUser = existing.isEmpty();
        AppUser user;
        if (newUser) {
            user = newUserEntity(now, clientIp, normalizeSource(request.registerSource()));
            user.setEmailHash(emailHash);
            user.setEmailMasked(emailCodec.mask(request.email()));
            // 昵称取哈希前 4 位，绝不含邮箱片段（避免在界面上反推账号）
            user.setNickname("影友" + emailCodec.nicknameSuffix(emailHash));
            user.setId(appUserDao.insert(user));
            log.info("C 端账号自动注册 userId={} source={} channel=EMAIL", user.getId(), user.getRegisterSource());
        } else {
            user = existing.get();
        }

        return completeLogin(user, newUser, request.agreements(), request.deviceId(), clientIp);
    }

    /** 两条登录通道共用的收尾流程：封禁 → 隐私 → 协议 → 赠额 → 令牌 */
    private UserLoginResponse completeLogin(AppUser user, boolean newUser,
                                            List<UserLoginRequest.AgreementItem> agreements,
                                            String deviceId, String clientIp) {
        LocalDateTime now = LocalDateTime.now();

        // 1) 封禁拦截：被封禁账号不签发令牌
        if (user.isBanned()) {
            String reason = user.getBanReason() == null || user.getBanReason().isBlank()
                    ? "账号存在违规使用记录" : user.getBanReason();
            throw BizException.of(ErrorCodes.USER_BANNED, "账号已被限制使用：" + reason);
        }

        // 2) 隐私设置初始化（本地优先：local_mode=1、cloud_allowed=0、不保留人脸特征）
        privacyDao.findOrCreate(user.getId(), now);

        // 3) 协议签署存证（只记编号 + 版本 + 指纹，不存协议正文）
        if (agreements != null) {
            for (UserLoginRequest.AgreementItem item : agreements) {
                if (item == null || item.code() == null || !consentService.isValidCode(item.code())) {
                    continue;
                }
                consentService.sign(user.getId(), item.code(), item.version(), deviceId, clientIp);
            }
        }

        // 4) 首次登录赠送额度（bizNo 幂等：重复调用不会重复发放）
        int registerGift = properties.getUser().getRegisterGiftQuota();
        if (newUser && registerGift > 0) {
            quotaService.grantRegisterGift(user.getId(), registerGift, QuotaService.TYPE_REGISTER_GIFT,
                    "GIFT-REGISTER-" + user.getId(), "首次登录赠送额度");
        }

        // 5) 登录成功留痕 + 签发令牌
        appUserDao.updateLoginSuccess(user.getId(), now);
        String token = jwtService.issueUserToken(user.getId(), user.accountMasked());
        List<String> signed = consentService.effectiveCodes(user.getId());
        int balance = quotaService.balanceOf(user.getId());

        log.info("C 端登录成功 userId={} newUser={} signedAgreements={}", user.getId(), newUser, signed.size());
        return new UserLoginResponse(
                token,
                jwtService.userTokenTtlSeconds(),
                newUser,
                new UserLoginResponse.UserInfo(user.getId(), user.getPhoneMasked(), user.getEmailMasked(),
                        user.getNickname(), format(user.getRegisterAt()), format(now),
                        user.getLoginCount() == null ? 1 : user.getLoginCount() + 1),
                new UserLoginResponse.QuotaInfo(balance, registerGift),
                signed,
                !consentService.allSigned(user.getId())
        );
    }

    private AppUser newUserEntity(LocalDateTime now, String clientIp, String source) {
        AppUser user = new AppUser();
        user.setStatus(1);
        user.setRegisterSource(source);
        user.setRegisterIp(clientIp);
        user.setRegisterAt(now);
        user.setLastLoginAt(now);
        user.setLoginCount(0);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        return user;
    }

    /** 我的页面资料（F-ACC-03）：额度、隐私开关、协议状态一次取回 */
    public UserProfileResponse profile(long userId) {
        AppUser user = appUserDao.findById(userId)
                .orElseThrow(() -> BizException.of(ErrorCodes.UNAUTHORIZED, "账号不存在或已注销，请重新登录"));
        PrivacySetting privacy = privacyDao.findOrCreate(userId, LocalDateTime.now());
        Map<String, UserConsent> signedMap = new LinkedHashMap<>();
        for (UserConsent consent : consentService.list(userId)) {
            signedMap.put(consent.getAgreementCode(), consent);
        }
        List<UserProfileResponse.ConsentView> views = new ArrayList<>();
        for (String code : ConsentService.allCodes()) {
            views.add(UserProfileResponse.ConsentView.of(signedMap.get(code), agreementName(code)));
        }
        return new UserProfileResponse(
                userId,
                user.getPhoneMasked(),
                user.getEmailMasked(),
                user.getNickname(),
                user.getStatus() == null ? 1 : user.getStatus(),
                format(user.getRegisterAt()),
                format(user.getLastLoginAt()),
                user.getLoginCount() == null ? 0 : user.getLoginCount(),
                quotaService.balanceOf(userId),
                privacy,
                views
        );
    }

    /** 签署单个协议（登录页之外，我的页面补充签署也走这里） */
    @Transactional
    public UserProfileResponse signConsent(long userId, String code, String version, String deviceId, String clientIp) {
        if (!consentService.isValidCode(code)) {
            throw BizException.of(ErrorCodes.PARAM_INVALID, "协议类型不正确");
        }
        consentService.sign(userId, code, version, deviceId, clientIp);
        log.info("协议签署 userId={} code={} version={}", userId, code, consentService.defaultVersion(version));
        return profile(userId);
    }

    /** 撤回授权（F-ACC-04）：撤回肖像权授权后拍摄与导出入口不可用 */
    @Transactional
    public UserProfileResponse revokeConsent(long userId, String code, String version, String reason) {
        if (!consentService.isValidCode(code)) {
            throw BizException.of(ErrorCodes.PARAM_INVALID, "协议类型不正确");
        }
        consentService.revoke(userId, code, version, reason == null || reason.isBlank() ? "用户主动撤回" : reason);
        log.info("协议撤回 userId={} code={}", userId, code);
        return profile(userId);
    }

    /** 隐私开关更新（F-ACC-03 / F-ACC-04）：只存开关值 */
    @Transactional
    public UserProfileResponse updatePrivacy(long userId, Integer localMode, Integer cloudAllowed,
                                             Integer faceFeatureSaved, Integer autoCleanDays) {
        if (autoCleanDays != null && (autoCleanDays < 0 || autoCleanDays > 365)) {
            throw BizException.of(ErrorCodes.PARAM_INVALID, "自动清理天数需在 0~365 之间");
        }
        privacyDao.findOrCreate(userId, LocalDateTime.now());
        privacyDao.update(userId, localMode, cloudAllowed, faceFeatureSaved, autoCleanDays, LocalDateTime.now());
        return profile(userId);
    }

    public static String agreementName(String code) {
        return switch (code) {
            case ConsentService.CODE_PORTRAIT -> "肖像权使用授权书";
            case ConsentService.CODE_PRIVACY -> "隐私政策";
            case ConsentService.CODE_SERVICE -> "用户服务协议";
            default -> code;
        };
    }

    private String normalizeSource(String source) {
        if (source == null || source.isBlank()) {
            return SOURCE_DEFAULT;
        }
        String upper = source.trim().toUpperCase();
        return upper.length() > 32 ? upper.substring(0, 32) : upper;
    }

    private String tailOf(String phone) {
        return phone.length() >= 4 ? phone.substring(phone.length() - 4) : phone;
    }

    private String format(LocalDateTime time) {
        return time == null ? null : TIME_FORMAT.format(time);
    }
}
