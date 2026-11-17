package com.photoshot.demo.plan;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 无模型可用时的关键词降级，也用于 LLM 输出未通过校验后的兜底。
 * 只要能在离线环境跑通「文本 → 计划」的链路即可，不追求语义覆盖度。
 */
public final class MockPlanner {

    private MockPlanner() {
    }

    public static PlanDsl plan(String text) {
        if (text.contains("换脸") || text.contains("把脸换成") || text.contains("伪造")) {
            return new PlanDsl("UNKNOWN", 0.9, true,
                    "换脸与证件伪造不在支持范围内，只能处理你本人的照片。", List.of(), "涉及他人肖像，无法处理。");
        }

        if (text.matches(".*(一寸|二寸|证件照|蓝底|白底|红底|简历照|报名照).*")) {
            String spec = text.contains("小一寸") ? "SMALL_1IN"
                    : text.contains("小二寸") ? "SMALL_2IN"
                    : text.contains("二寸") ? "2IN" : "1IN";
            String bg = text.contains("白底") ? "#FFFFFF"
                    : text.contains("红底") ? "#D93A3A" : "#438EDB";

            List<PlanDsl.Step> steps = new ArrayList<>();
            steps.add(new PlanDsl.Step("s1", "FACE_DETECT", "DEVICE",
                    Map.of("maxFaces", 1), List.of(), true));
            steps.add(new PlanDsl.Step("s2", "MATTING", "DEVICE",
                    Map.of("edgeFeatherPx", 2), List.of("s1"), true));
            steps.add(new PlanDsl.Step("s3", "ID_PHOTO_SPEC", "DEVICE",
                    Map.of("spec", spec, "bgColor", bg, "headRatio", 0.62), List.of("s2"), true));
            return new PlanDsl("ID_PHOTO", 0.8, false, null, steps, "证件照规格裁切并换底，端侧处理。");
        }

        List<PlanDsl.Step> steps = new ArrayList<>();
        steps.add(new PlanDsl.Step("s1", "FACE_DETECT", "DEVICE",
                Map.of("maxFaces", 1), List.of(), true));

        if (text.contains("动漫") || text.contains("插画") || text.contains("漫画") || text.contains("像素")) {
            String style = text.contains("动漫") ? "ANIME"
                    : text.contains("漫画") ? "COMIC" : "ILLUSTRATION";
            steps.add(new PlanDsl.Step("s2", "STYLE_TRANSFER", "CLOUD",
                    Map.of("style", style), List.of("s1"), true));
            return new PlanDsl("STYLE", 0.75, false, null, steps, "风格化处理，需要云端逐次授权。");
        }
        // 虚化必须排在换背景之前：「把背景虚化」也含「背景」二字。
        if (text.contains("虚化") || text.contains("景深")) {
            steps.add(new PlanDsl.Step("s2", "BLUR", "DEVICE",
                    Map.of("radius", 40), List.of("s1"), true));
            return new PlanDsl("STUDIO", 0.7, false, null, steps, "背景虚化，端侧处理。");
        }
        if (text.contains("背景") || text.contains("户外") || text.contains("换景")) {
            String scene = text.contains("户外") ? "OUTDOOR"
                    : text.contains("办公") ? "OFFICE"
                    : text.contains("纯") ? "PURE" : "STUDIO";
            steps.add(new PlanDsl.Step("s2", "GEN_BACKGROUND", "CLOUD",
                    Map.of("scene", scene), List.of("s1"), true));
            return new PlanDsl("COMPOSITE", 0.7, false, null, steps, "生成式换背景，需要云端逐次授权。");
        }

        return new PlanDsl("UNKNOWN", 0.35, true,
                "你想要证件照、形象照，还是某一种特定风格？", List.of(), "需求过于笼统，无法确定具体处理方式。");
    }
}
