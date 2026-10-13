package com.photoshot.demo.controller;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/log")
@RequiredArgsConstructor
public class FrontLogController {
    private static final Logger log = LoggerFactory.getLogger(FrontLogController.class);

    @PostMapping("/save")
    public void saveFrontLog(@RequestBody Map<String, Object> logData) {
        String type = logData.get("type").toString();
        String msg = logData.get("message").toString();
        if ("error".equals(type)) {
            log.error("[前端报错] {}", logData); // 写入后端error.log
        } else {
            log.info("[前端日志] {}", logData); // 写入后端info.log
        }
    }
}
