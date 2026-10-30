package com.photoshot.demo.plan;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 豆包（火山方舟）的 OpenAI 兼容接口配置。协议与 OpenAI 一致，
 * 换成通义、智谱、DeepSeek 只改 base-url 与 model，不改代码。
 */
@Data
@Component
@ConfigurationProperties(prefix = "llm")
public class LlmProperties {

    private String baseUrl = "https://ark.cn-beijing.volces.com/api/v3";

    /**
     * 填火山方舟控制台里的接入点 ID（ep-xxxxxxxx）或 Model ID。
     * 型号迭代快，不写默认值，没配就降级到规则解析。
     */
    private String model = "";

    private String apiKey = "";

    /** LLM 挡在交互路径上，超时必须明显短于图像能力。 */
    private long timeoutMs = 3000;

    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank()
                && model != null && !model.isBlank();
    }
}
