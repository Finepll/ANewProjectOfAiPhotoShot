package com.photoshot.demo.plan;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class PlanController {

    private static final Logger log = LoggerFactory.getLogger(PlanController.class);

    private final PlanService service;

    public record PlanRequest(String text) {
    }

    @PostMapping("/plan")
    public PlanResponse plan(@RequestBody PlanRequest request) {
        return service.create(request == null ? null : request.text());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        String message = e.getMessage() == null ? "请求参数不合法" : e.getMessage();
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> unavailable(IllegalStateException e) {
        log.error("计划解析失败", e);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("message", "计划解析失败，请稍后重试"));
    }
}
