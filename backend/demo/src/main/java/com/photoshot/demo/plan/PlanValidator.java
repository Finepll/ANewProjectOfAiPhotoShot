package com.photoshot.demo.plan;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 模型输出一律视为不可信输入。这里是提示词之外的最后一道防线：
 * 即使模型被诱导输出白名单外或禁用能力，也会在返回给客户端之前被拦下。
 */
@Component
public class PlanValidator {

    public record Result(boolean valid, List<String> errors, PlanDsl cleaned) {
    }

    private static final Set<String> INTENTS =
            Set.of("ID_PHOTO", "STUDIO", "STYLE", "COMPOSITE", "UNKNOWN");

    private static final Set<String> FORBIDDEN =
            Set.of("FACE_SWAP", "ID_FORGE", "FREE_PROMPT", "FACE_FEATURE_EXTRACT");

    /** capability → 允许的执行位置 */
    private static final Map<String, Set<String>> ALLOWED_EXECUTION = Map.ofEntries(
            Map.entry("FACE_DETECT", Set.of("DEVICE")),
            Map.entry("MATTING", Set.of("DEVICE")),
            Map.entry("ID_PHOTO_SPEC", Set.of("DEVICE")),
            Map.entry("BLUR", Set.of("DEVICE")),
            Map.entry("LUT_FILTER", Set.of("DEVICE")),
            Map.entry("STICKER", Set.of("DEVICE")),
            Map.entry("DOODLE", Set.of("DEVICE")),
            Map.entry("SUPER_RES", Set.of("DEVICE", "CLOUD")),
            Map.entry("EXPORT_BUNDLE", Set.of("DEVICE")),
            Map.entry("STYLE_TRANSFER", Set.of("CLOUD")),
            Map.entry("GEN_BACKGROUND", Set.of("CLOUD")),
            Map.entry("TRY_ON", Set.of("CLOUD"))
    );

    private static final Set<String> SPECS = Set.of("1IN", "2IN", "SMALL_1IN", "SMALL_2IN");
    private static final Set<String> LUT_PRESETS =
            Set.of("WARM", "COOL", "MONO", "PIXEL", "SHARPEN", "OUTLINE");
    private static final Set<String> STYLES = Set.of("ILLUSTRATION", "ANIME", "COMIC");
    private static final Set<String> SCENES = Set.of("STUDIO", "OUTDOOR", "OFFICE", "PURE");
    private static final String HEX_COLOR = "^#[0-9A-Fa-f]{6}$";

    public Result validate(PlanDsl plan) {
        List<String> errors = new ArrayList<>();
        if (plan == null) {
            return new Result(false, List.of("计划为空"), null);
        }
        if (plan.intent() == null || !INTENTS.contains(plan.intent())) {
            errors.add("intent 非法：" + plan.intent());
        }
        if (plan.confidence() < 0 || plan.confidence() > 1) {
            errors.add("confidence 越界：" + plan.confidence());
        }
        if (plan.confidence() < 0.6 && !plan.needsClarification()) {
            errors.add("confidence 低于 0.6 时必须追问");
        }

        List<PlanDsl.Step> steps = plan.steps() == null ? List.of() : plan.steps();
        if (plan.needsClarification()) {
            if (steps.size() > 0) {
                errors.add("追问状态下 steps 必须为空");
            }
        } else if (steps.isEmpty() || steps.size() > 5) {
            errors.add("steps 数量必须在 1 到 5 之间，当前 " + steps.size());
        }

        Set<String> seen = new HashSet<>();
        List<PlanDsl.Step> cleaned = new ArrayList<>();
        for (PlanDsl.Step step : steps) {
            String id = step.stepId();
            if (id == null || id.isBlank()) {
                errors.add("stepId 不能为空");
            } else if (!seen.add(id)) {
                errors.add("stepId 重复：" + id);
            }

            String capability = step.capability();
            if (capability == null || FORBIDDEN.contains(capability)) {
                errors.add("命中禁用能力：" + capability);
                continue;
            }
            Set<String> allowed = ALLOWED_EXECUTION.get(capability);
            if (allowed == null) {
                errors.add("能力不在白名单：" + capability);
                continue;
            }
            if (!allowed.contains(step.execution())) {
                errors.add("执行位置非法：" + capability + " 不支持 " + step.execution());
                continue;
            }

            for (String dep : step.dependsOn() == null ? List.<String>of() : step.dependsOn()) {
                if (!seen.contains(dep)) {
                    errors.add("依赖引用不存在或不在前序：" + id + " → " + dep);
                }
            }

            Map<String, Object> kept = checkParams(capability, step.params(), errors);
            cleaned.add(new PlanDsl.Step(id, capability, step.execution(), kept,
                    step.dependsOn() == null ? List.of() : step.dependsOn(), step.required()));
        }

        return new Result(errors.isEmpty(), errors, errors.isEmpty() ? rebuild(plan, cleaned) : null);
    }

    private PlanDsl rebuild(PlanDsl plan, List<PlanDsl.Step> cleaned) {
        return new PlanDsl(plan.intent(), plan.confidence(), plan.needsClarification(),
                plan.clarifyQuestion(), cleaned, plan.explain());
    }

    /** 已知参数逐项校验，未知参数直接丢弃。 */
    private Map<String, Object> checkParams(String capability, Map<String, Object> params, List<String> errors) {
        Map<String, Object> kept = new LinkedHashMap<>();
        if (params == null) {
            return kept;
        }
        switch (capability) {
            case "FACE_DETECT" -> intIn(params, "maxFaces", 1, 3, kept, errors);
            case "MATTING" -> intIn(params, "edgeFeatherPx", 0, 8, kept, errors);
            case "ID_PHOTO_SPEC" -> {
                enumOf(params, "spec", SPECS, kept, errors);
                colorOf(params, "bgColor", kept, errors);
                doubleIn(params, "headRatio", 0.5, 0.75, kept, errors);
            }
            case "BLUR" -> intIn(params, "radius", 0, 100, kept, errors);
            case "LUT_FILTER" -> enumOf(params, "preset", LUT_PRESETS, kept, errors);
            case "STICKER" -> stringOf(params, "stickerId", kept);
            case "DOODLE" -> colorOf(params, "color", kept, errors);
            case "SUPER_RES" -> {
                Object scale = params.get("scale");
                if (scale instanceof Number n && (n.intValue() == 2 || n.intValue() == 4)) {
                    kept.put("scale", n.intValue());
                } else if (scale != null) {
                    errors.add("scale 只能是 2 或 4：" + scale);
                }
            }
            case "EXPORT_BUNDLE" -> {
                Object specs = params.get("specs");
                if (specs instanceof List<?> list && !list.isEmpty() && list.size() <= 4
                        && list.stream().allMatch(v -> SPECS.contains(String.valueOf(v)))) {
                    kept.put("specs", list);
                } else if (specs != null) {
                    errors.add("specs 必须是 1 到 4 个合法规格");
                }
            }
            case "STYLE_TRANSFER" -> enumOf(params, "style", STYLES, kept, errors);
            case "GEN_BACKGROUND" -> enumOf(params, "scene", SCENES, kept, errors);
            case "TRY_ON" -> stringOf(params, "outfitId", kept);
            default -> {
            }
        }
        return kept;
    }

    private void intIn(Map<String, Object> params, String key, int min, int max,
                       Map<String, Object> kept, List<String> errors) {
        Object value = params.get(key);
        if (value == null) {
            return;
        }
        if (value instanceof Number n && n.intValue() >= min && n.intValue() <= max) {
            kept.put(key, n.intValue());
        } else {
            errors.add(key + " 越界：" + value);
        }
    }

    private void doubleIn(Map<String, Object> params, String key, double min, double max,
                          Map<String, Object> kept, List<String> errors) {
        Object value = params.get(key);
        if (value == null) {
            return;
        }
        if (value instanceof Number n && n.doubleValue() >= min && n.doubleValue() <= max) {
            kept.put(key, n.doubleValue());
        } else {
            errors.add(key + " 越界：" + value);
        }
    }

    private void enumOf(Map<String, Object> params, String key, Set<String> allowed,
                        Map<String, Object> kept, List<String> errors) {
        Object value = params.get(key);
        if (value == null) {
            return;
        }
        String text = String.valueOf(value);
        if (allowed.contains(text)) {
            kept.put(key, text);
        } else {
            errors.add(key + " 取值非法：" + value);
        }
    }

    private void colorOf(Map<String, Object> params, String key,
                         Map<String, Object> kept, List<String> errors) {
        Object value = params.get(key);
        if (value == null) {
            return;
        }
        String text = String.valueOf(value);
        if (text.matches(HEX_COLOR)) {
            kept.put(key, text);
        } else {
            errors.add(key + " 不是合法颜色：" + value);
        }
    }

    private void stringOf(Map<String, Object> params, String key, Map<String, Object> kept) {
        Object value = params.get(key);
        if (value != null) {
            kept.put(key, String.valueOf(value));
        }
    }
}
