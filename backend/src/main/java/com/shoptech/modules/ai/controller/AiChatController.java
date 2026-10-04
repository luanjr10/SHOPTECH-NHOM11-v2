package com.shoptech.modules.ai.controller;

import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.ratelimit.RateLimiter;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.ai.service.AiChatService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

/** Chatbot tư vấn trên trang khách hàng (công khai, giới hạn 20 tin/phút mỗi IP). */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private static final int MAX_MESSAGES = 24;
    private static final int MAX_CONTENT = 2000;
    private static final Set<String> ROLES = Set.of("user", "assistant");

    private final AiChatService aiChatService;
    private final RateLimiter rateLimiter;

    public record ChatRequest(List<AiChatService.Message> messages) {
    }

    @PostMapping("/chat")
    public ApiResponse<AiChatService.Reply> chat(@RequestBody ChatRequest request, HttpServletRequest http) {
        rateLimiter.check("ai-chat:" + http.getRemoteAddr(), 20);
        List<AiChatService.Message> messages = request.messages();
        if (messages == null || messages.isEmpty() || messages.size() > MAX_MESSAGES
                || messages.stream().anyMatch(m -> m == null || !ROLES.contains(m.role())
                || m.content() == null || m.content().isBlank() || m.content().length() > MAX_CONTENT)) {
            throw ValidationException.of("messages", "Nội dung tin nhắn không hợp lệ");
        }
        return ApiResponse.ok(aiChatService.respond(messages));
    }
}
