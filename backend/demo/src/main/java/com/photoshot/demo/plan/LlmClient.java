package com.photoshot.demo.plan;

import tools.jackson.databind.JsonNode;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 只用 OpenAI 兼容的 /chat/completions，不引任何厂商 SDK。 */
@Component
public class LlmClient {

    private final RestClient restClient;
    private final LlmProperties props;

    public LlmClient(LlmProperties props) {
        this.props = props;
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofMillis(props.getTimeoutMs()));
        this.restClient = RestClient.builder()
                .baseUrl(props.getBaseUrl())
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + props.getApiKey())
                .build();
    }

    /** 返回模型输出的原始文本。调用方负责解析与校验。 */
    public String complete(String system, String user) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", props.getModel());
        payload.put("temperature", 0);
        payload.put("messages", List.of(
                Map.of("role", "system", "content", system),
                Map.of("role", "user", "content", user)
        ));
        payload.put("response_format", Map.of("type", "json_object"));

        JsonNode response;
        try {
            response = send(payload);
        } catch (RestClientResponseException e) {
            // 部分型号不接受 response_format，去掉后仅靠提示词约束再试一次。
            if (!e.getStatusCode().is4xxClientError()) {
                throw e;
            }
            payload.remove("response_format");
            response = send(payload);
        }

        JsonNode content = response == null ? null : response.at("/choices/0/message/content");
        if (content == null || content.isMissingNode() || content.asText().isBlank()) {
            throw new IllegalStateException("模型未返回内容");
        }
        return content.asText();
    }

    private JsonNode send(Map<String, Object> payload) {
        return restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(JsonNode.class);
    }
}
