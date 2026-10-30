package com.photoshot.demo.plan;

import java.util.List;

/**
 * 返回给客户端的计划。estimatedCost 与 needsUserConfirm 由服务端计算，
 * 不接受模型给出的值——模型只负责翻译意图，不负责报价和授权判断。
 */
public record PlanResponse(
        String planNo,
        String intent,
        double confidence,
        boolean needsClarification,
        String clarifyQuestion,
        List<PlanDsl.Step> steps,
        int estimatedCost,
        boolean needsUserConfirm,
        String explain,
        String source
) {
}
