package com.photoshot.demo.plan;

import java.util.List;
import java.util.Map;

/** 模型输出的修图计划。字段与 prompts/plan-system.md 中的 schema 一一对应。 */
public record PlanDsl(
        String intent,
        double confidence,
        boolean needsClarification,
        String clarifyQuestion,
        List<Step> steps,
        String explain
) {

    public record Step(
            String stepId,
            String capability,
            String execution,
            Map<String, Object> params,
            List<String> dependsOn,
            boolean required
    ) {
    }
}
