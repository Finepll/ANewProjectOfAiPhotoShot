package com.photoshot.demo.controller;

import com.photoshot.demo.common.ApiResult;
import com.photoshot.demo.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 健康检查（白名单，前端与小程序启动时探测服务是否可用）。
 * 只返回服务与数据库连通性，不暴露任何配置值与环境细节。
 */
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final JdbcTemplate jdbc;
    private final AppProperties properties;

    @GetMapping
    public ApiResult<Map<String, Object>> health() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("service", "photoshot-backend");
        data.put("time", LocalDateTime.now().toString());
        data.put("smsDevMode", properties.getSms().isDevMode());
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            data.put("database", "up");
        } catch (Exception e) {
            data.put("database", "down");
        }
        return ApiResult.ok(data);
    }
}
