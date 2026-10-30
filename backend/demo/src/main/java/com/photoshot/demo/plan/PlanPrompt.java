package com.photoshot.demo.plan;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/** 加载 classpath 下的 system 提示词，便于改文案而不重新编译。 */
@Component
public class PlanPrompt {

    private static final String PATH = "/prompts/plan-system.md";

    private final String system;

    public PlanPrompt() {
        try (InputStream in = getClass().getResourceAsStream(PATH)) {
            if (in == null) {
                throw new IllegalStateException("缺少提示词文件 " + PATH);
            }
            this.system = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public String system() {
        return system;
    }
}
