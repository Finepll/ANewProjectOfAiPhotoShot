package com.photoshot.demo.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.photoshot.demo.common.BizException;
import com.photoshot.demo.common.ErrorCodes;
import com.photoshot.demo.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.List;

/**
 * JWT 签发与校验（F-SRV-01）。
 * 载荷只放账号标识、类型与角色，禁止写入手机号明文、人脸特征、图片信息等敏感数据。
 */
@Service
@RequiredArgsConstructor
public class JwtService {

    private static final String CLAIM_TYPE = "typ";
    private static final String CLAIM_ROLES = "roles";

    private final AppProperties properties;

    /** C 端用户令牌（7 天，可配） */
    public String issueUserToken(long userId, String phoneMasked) {
        return issue(userId, LoginUser.TYPE_USER, phoneMasked, List.of(), properties.getJwt().getUserTtlMinutes());
    }

    /** 管理端令牌（12 小时，可配） */
    public String issueAdminToken(long adminId, String username, List<String> roleCodes) {
        return issue(adminId, LoginUser.TYPE_ADMIN, username, roleCodes, properties.getJwt().getAdminTtlMinutes());
    }

    public long userTokenTtlSeconds() {
        return properties.getJwt().getUserTtlMinutes() * 60;
    }

    public long adminTokenTtlSeconds() {
        return properties.getJwt().getAdminTtlMinutes() * 60;
    }

    private String issue(long id, String type, String name, List<String> roles, long ttlMinutes) {
        Instant now = Instant.now();
        return JWT.create()
                .withSubject(String.valueOf(id))
                .withClaim(CLAIM_TYPE, type)
                .withClaim("name", name)
                .withArrayClaim(CLAIM_ROLES, roles.toArray(new String[0]))
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plusSeconds(ttlMinutes * 60)))
                .sign(Algorithm.HMAC256(properties.getJwt().getSecret()));
    }

    /** 解析令牌；过期与非法分别给出可读提示 */
    public LoginUser parse(String token) {
        try {
            JWTVerifier verifier = JWT.require(Algorithm.HMAC256(properties.getJwt().getSecret())).build();
            DecodedJWT jwt = verifier.verify(token);
            String type = jwt.getClaim(CLAIM_TYPE).asString();
            List<String> roles = jwt.getClaim(CLAIM_ROLES).asList(String.class);
            return new LoginUser(type, Long.parseLong(jwt.getSubject()), jwt.getClaim("name").asString(), roles);
        } catch (com.auth0.jwt.exceptions.TokenExpiredException e) {
            throw BizException.of(ErrorCodes.TOKEN_EXPIRED, "登录态已过期，请重新登录");
        } catch (JWTVerificationException | IllegalArgumentException e) {
            throw BizException.of(ErrorCodes.UNAUTHORIZED, "登录态无效，请重新登录");
        }
    }
}
