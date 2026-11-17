package com.photoshot.demo.plan;

import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class PlanService {

    private static final Logger log = LoggerFactory.getLogger(PlanService.class);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final int MAX_LEN = 200;

    private final PlanPrompt prompt;
    private final PlanValidator validator;
    private final LlmClient llm;
    private final LlmProperties props;
    private final ObjectMapper objectMapper;

    public PlanResponse create(String text) {
        String input = text == null ? "" : text.strip();
        if (input.isEmpty()) {
            throw new IllegalArgumentException("请输入想要的照片效果");
        }
        if (input.length() > MAX_LEN) {
            throw new IllegalArgumentException("描述请控制在 " + MAX_LEN + " 字以内");
        }

        PlanDsl plan = null;
        String source = "RULE";

        if (props.enabled()) {
            plan = ask(input);
            if (plan != null) {
                source = "LLM";
            } else {
                log.warn("模型不可用，改用规则解析");
            }
        } else {
            log.info("未配置 llm.model 或 llm.api-key，使用规则解析");
        }
        if (plan == null) {
            plan = MockPlanner.plan(input);
        }

        PlanValidator.Result result = validator.validate(plan);
        if (!result.valid()) {
            // 模型输出不可信，失败后不信模型给的建议，直接换成规则结果。
            log.warn("计划校验未通过，降级到规则：{}", result.errors());
            source = "RULE";
            plan = MockPlanner.plan(input);
            result = validator.validate(plan);
            if (!result.valid()) {
                throw new IllegalStateException("计划解析失败：" + result.errors());
            }
        }
        return toResponse(result.cleaned(), source);
    }

    /** 失败只重试一次：重试也计费，且会拉长用户等待。 */
    private PlanDsl ask(String input) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String raw = llm.complete(prompt.system(), input);
                return objectMapper.readValue(stripFence(raw), PlanDsl.class);
            } catch (Exception e) {
                log.warn("模型调用第 {} 次失败：{}", attempt, e.toString());
            }
        }
        return null;
    }

    /** 模型偶尔无视「不要代码围栏」，这里兜一层，不依赖提示词自觉。 */
    private String stripFence(String raw) {
        String text = raw.strip();
        if (!text.startsWith("```")) {
            return text;
        }
        int firstNewline = text.indexOf('\n');
        int lastFence = text.lastIndexOf("```");
        if (firstNewline < 0 || lastFence <= firstNewline) {
            return text;
        }
        return text.substring(firstNewline + 1, lastFence).strip();
    }

    private PlanResponse toResponse(PlanDsl plan, String source) {
        List<PlanDsl.Step> steps = plan.steps() == null ? List.of() : plan.steps();
        int cloudSteps = (int) steps.stream()
                .filter(step -> "CLOUD".equals(step.execution()))
                .count();
        return new PlanResponse(
                nextPlanNo(),
                plan.intent(),
                plan.confidence(),
                plan.needsClarification(),
                plan.clarifyQuestion(),
                steps,
                cloudSteps,
                cloudSteps > 0,
                plan.explain(),
                source
        );
    }

    private String nextPlanNo() {
        return "pl_" + LocalDate.now().format(DAY) + "_"
                + Integer.toHexString(ThreadLocalRandom.current().nextInt(0x100000, 0xFFFFFF));
    }
}
