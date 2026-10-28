package com.photoshot.demo.user.controller;

import com.photoshot.demo.common.ApiResult;
import com.photoshot.demo.common.WebUtils;
import com.photoshot.demo.security.AuthContext;
import com.photoshot.demo.user.dao.QuotaDao;
import com.photoshot.demo.user.dto.ConsentSignRequest;
import com.photoshot.demo.user.dto.EmailLoginRequest;
import com.photoshot.demo.user.dto.EmailSendCodeRequest;
import com.photoshot.demo.user.dto.PrivacyUpdateRequest;
import com.photoshot.demo.user.dto.SendCodeRequest;
import com.photoshot.demo.user.dto.SendCodeResponse;
import com.photoshot.demo.user.dto.UserLoginRequest;
import com.photoshot.demo.user.dto.UserLoginResponse;
import com.photoshot.demo.user.dto.UserProfileResponse;
import com.photoshot.demo.user.service.SmsCodeService;
import com.photoshot.demo.user.service.EmailCodeService;
import com.photoshot.demo.user.service.UserAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 小程序端账号接口（F-ACC-01 ~ F-ACC-04）。
 *
 * 登录方式：手机号 + 短信验证码，未注册自动注册（不做密码体系，也不提供第三方登录）。
 * 隐私口径：上行数据只有手机号、验证码、设备标识与协议勾选，不含图片、人脸与位置。
 */
@RestController
@RequestMapping("/api/user/auth")
@RequiredArgsConstructor
public class UserAuthController {

    private final UserAuthService userAuthService;
    private final SmsCodeService smsCodeService;
    private final EmailCodeService emailCodeService;
    private final QuotaDao quotaDao;

    /** 下发登录验证码：5 分钟有效、60 秒频控、单日上限防刷 */
    @PostMapping("/code")
    public ApiResult<SendCodeResponse> sendCode(@Valid @RequestBody SendCodeRequest request, HttpServletRequest http) {
        SmsCodeService.SendResult result = smsCodeService.send(request.phone(), SmsCodeService.SCENE_LOGIN,
                WebUtils.clientIp(http));
        String message = result.devCode() == null
                ? "验证码已发送，请留意短信"
                : "验证码已生成（开发模式固定验证码：" + result.devCode() + "）";
        return ApiResult.ok(new SendCodeResponse(result.devCode(), result.expireSeconds(),
                result.resendAfterSeconds(), message));
    }

    /** 下发邮箱登录验证码：10 分钟有效、60 秒频控、单日上限防刷 */
    @PostMapping("/email/code")
    public ApiResult<SendCodeResponse> sendEmailCode(@Valid @RequestBody EmailSendCodeRequest request,
                                                     HttpServletRequest http) {
        EmailCodeService.SendResult result = emailCodeService.send(request.email(), EmailCodeService.SCENE_LOGIN,
                WebUtils.clientIp(http));
        String message = result.devCode() == null
                ? "验证码已发送至邮箱，请查收（含垃圾邮件箱）"
                : "验证码已生成（开发模式固定验证码：" + result.devCode() + "）";
        return ApiResult.ok(new SendCodeResponse(result.devCode(), result.expireSeconds(),
                result.resendAfterSeconds(), message));
    }

    /** 邮箱登录（未注册自动注册）；与手机号登录共用协议、额度与留痕逻辑 */
    @PostMapping("/email/login")
    public ApiResult<UserLoginResponse> loginByEmail(@Valid @RequestBody EmailLoginRequest request,
                                                     HttpServletRequest http) {
        return ApiResult.ok(userAuthService.loginByEmail(request, WebUtils.clientIp(http)));
    }

    /** 登录（未注册自动注册）；agreements 一并完成协议存证 */
    @PostMapping("/login")
    public ApiResult<UserLoginResponse> login(@Valid @RequestBody UserLoginRequest request, HttpServletRequest http) {
        return ApiResult.ok(userAuthService.login(request, WebUtils.clientIp(http)));
    }

    /** 我的：资料 + 额度 + 隐私开关 + 协议状态 */
    @GetMapping("/me")
    public ApiResult<UserProfileResponse> me() {
        return ApiResult.ok(userAuthService.profile(AuthContext.requireUserId()));
    }

    /** 协议列表（含是否已签署、签署时间与存证指纹） */
    @GetMapping("/agreement/list")
    public ApiResult<List<UserProfileResponse.ConsentView>> agreements() {
        return ApiResult.ok(userAuthService.profile(AuthContext.requireUserId()).consents());
    }

    /** 补充签署某个协议 */
    @PostMapping("/agreement")
    public ApiResult<UserProfileResponse> signAgreement(@Valid @RequestBody ConsentSignRequest request,
                                                        HttpServletRequest http) {
        return ApiResult.ok(userAuthService.signConsent(AuthContext.requireUserId(), request.code(),
                request.version(), request.deviceId(), WebUtils.clientIp(http)));
    }

    /** 撤回授权（撤回肖像权授权后拍摄/导出入口关闭） */
    @PostMapping("/agreement/revoke")
    public ApiResult<UserProfileResponse> revokeAgreement(@Valid @RequestBody ConsentSignRequest request) {
        return ApiResult.ok(userAuthService.revokeConsent(AuthContext.requireUserId(), request.code(),
                request.version(), request.reason()));
    }

    /** 隐私开关：本地模式 / 云授权 / 是否本机保留人脸特征 / 自动清理天数 */
    @PutMapping("/privacy")
    public ApiResult<UserProfileResponse> updatePrivacy(@RequestBody PrivacyUpdateRequest request) {
        return ApiResult.ok(userAuthService.updatePrivacy(AuthContext.requireUserId(), request.localMode(),
                request.cloudAllowed(), request.faceFeatureSaved(), request.autoCleanDays()));
    }

    /** 额度流水（近 N 条，默认 20） */
    @GetMapping("/quota/flows")
    public ApiResult<List<QuotaDao.Flow>> quotaFlows(@RequestParam(defaultValue = "20") int limit) {
        return ApiResult.ok(quotaDao.listFlows(AuthContext.requireUserId(), Math.min(Math.max(limit, 1), 100)));
    }

    /** 退出登录：令牌为无状态 JWT，端上清除即可，服务端只做入口收敛 */
    @PostMapping("/logout")
    public ApiResult<Void> logout() {
        AuthContext.requireUserId();
        return ApiResult.ok();
    }
}
