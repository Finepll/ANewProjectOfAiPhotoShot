package com.photoshot.demo.plan;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlanValidatorTest {

    private final PlanValidator validator = new PlanValidator();

    private PlanDsl.Step step(String id, String capability, String execution,
                              Map<String, Object> params, List<String> dependsOn) {
        return new PlanDsl.Step(id, capability, execution, params, dependsOn, true);
    }

    private PlanDsl plan(double confidence, boolean needsClarification, List<PlanDsl.Step> steps) {
        return new PlanDsl("ID_PHOTO", confidence, needsClarification, null, steps, "测试计划");
    }

    @Test
    @DisplayName("合法证件照计划通过校验")
    void acceptsValidPlan() {
        List<PlanDsl.Step> steps = List.of(
                step("s1", "FACE_DETECT", "DEVICE", Map.of("maxFaces", 1), List.of()),
                step("s2", "MATTING", "DEVICE", Map.of("edgeFeatherPx", 2), List.of("s1")),
                step("s3", "ID_PHOTO_SPEC", "DEVICE",
                        Map.of("spec", "1IN", "bgColor", "#438EDB", "headRatio", 0.62), List.of("s2"))
        );
        PlanValidator.Result result = validator.validate(plan(0.92, false, steps));
        assertTrue(result.valid(), () -> result.errors().toString());
        assertEquals(3, result.cleaned().steps().size());
    }

    @Test
    @DisplayName("白名单外能力被拒绝")
    void rejectsUnknownCapability() {
        PlanDsl p = plan(0.9, false,
                List.of(step("s1", "AI_MAGIC", "DEVICE", Map.of(), List.of())));
        assertFalse(validator.validate(p).valid());
    }

    @Test
    @DisplayName("禁用能力被拒绝")
    void rejectsForbiddenCapability() {
        PlanDsl p = plan(0.9, false,
                List.of(step("s1", "FACE_SWAP", "CLOUD", Map.of(), List.of())));
        PlanValidator.Result result = validator.validate(p);
        assertFalse(result.valid());
        assertTrue(result.errors().stream().anyMatch(e -> e.contains("禁用能力")));
    }

    @Test
    @DisplayName("执行位置与能力不匹配时拒绝")
    void rejectsWrongExecution() {
        PlanDsl p = plan(0.9, false,
                List.of(step("s1", "GEN_BACKGROUND", "DEVICE", Map.of("scene", "OUTDOOR"), List.of())));
        assertFalse(validator.validate(p).valid());
    }

    @Test
    @DisplayName("依赖引用不存在时拒绝")
    void rejectsDanglingDependency() {
        PlanDsl p = plan(0.9, false,
                List.of(step("s1", "BLUR", "DEVICE", Map.of("radius", 40), List.of("s9"))));
        assertFalse(validator.validate(p).valid());
    }

    @Test
    @DisplayName("参数越界时拒绝")
    void rejectsOutOfRangeParam() {
        PlanDsl p = plan(0.9, false,
                List.of(step("s1", "BLUR", "DEVICE", Map.of("radius", 200), List.of())));
        assertFalse(validator.validate(p).valid());
    }

    @Test
    @DisplayName("未知参数被丢弃而不是报错")
    void dropsUnknownParams() {
        PlanDsl p = plan(0.9, false,
                List.of(step("s1", "BLUR", "DEVICE",
                        Map.of("radius", 40, "faceSwapTarget", "someone"), List.of())));
        PlanValidator.Result result = validator.validate(p);
        assertTrue(result.valid(), () -> result.errors().toString());
        assertFalse(result.cleaned().steps().get(0).params().containsKey("faceSwapTarget"));
    }

    @Test
    @DisplayName("置信度低于阈值却没有追问时拒绝")
    void rejectsLowConfidenceWithoutClarification() {
        PlanDsl p = plan(0.3, false,
                List.of(step("s1", "BLUR", "DEVICE", Map.of("radius", 40), List.of())));
        assertFalse(validator.validate(p).valid());
    }

    @Test
    @DisplayName("步数超过 5 时拒绝")
    void rejectsTooManySteps() {
        List<PlanDsl.Step> steps = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            steps.add(step("s" + i, "BLUR", "DEVICE", Map.of("radius", 10),
                    i == 1 ? List.of() : List.of("s" + (i - 1))));
        }
        assertFalse(validator.validate(plan(0.9, false, steps)).valid());
    }

    @Test
    @DisplayName("追问状态下不允许携带步骤")
    void rejectsStepsWhenClarifying() {
        PlanDsl p = plan(0.9, true,
                List.of(step("s1", "BLUR", "DEVICE", Map.of("radius", 40), List.of())));
        assertFalse(validator.validate(p).valid());
    }
}
