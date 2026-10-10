package com.shoptech.modules.chat.controller;

import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.ratelimit.RateLimiter;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.modules.chat.service.ChatService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Chat phía khách: nhắn gian hàng hoặc đội hỗ trợ ShopTech. */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final RateLimiter rateLimiter;

    public record StartRequest(Long storeId) {
    }

    @GetMapping("/conversations")
    public ApiResponse<List<Map<String, Object>>> index() {
        return ApiResponse.ok(chatService.conversationsOfCustomer(AccessGuard.currentUser().id()));
    }

    @PostMapping("/conversations")
    public ApiResponse<Map<String, Object>> start(@RequestBody StartRequest request) {
        if (request.storeId() == null) {
            throw ValidationException.of("store_id", "Vui lòng chọn gian hàng");
        }
        return ApiResponse.ok(chatService.startConversation(AccessGuard.currentUser().id(), request.storeId()));
    }

    @PostMapping("/support")
    public ApiResponse<Map<String, Object>> startSupport() {
        return ApiResponse.ok(chatService.startSupportConversation(AccessGuard.currentUser().id()));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Integer>> unreadCount() {
        return ApiResponse.ok(Map.of("count", chatService.unreadForCustomer(AccessGuard.currentUser().id())));
    }

    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<Map<String, Object>> messages(@PathVariable Long id,
                                                      @RequestParam(name = "after_id", required = false) Long afterId) {
        Map<String, Object> conversation = chatService.ownedByCustomer(id, AccessGuard.currentUser().id());
        List<Map<String, Object>> messages = chatService.messages(id, afterId == null ? 0 : afterId);
        chatService.markRead(id, ChatService.SIDE_CUSTOMER);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("store", chatService.storeOfConversation(conversation));
        data.put("messages", messages);
        return ApiResponse.ok(data);
    }

    public record SendRequest(String body, Integer productId) {
    }

    /** Tin chỉ có chữ gửi dạng JSON. */
    @PostMapping(value = "/conversations/{id}/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendText(@PathVariable Long id, @RequestBody SendRequest request) {
        return deliver(id, request.body(), request.productId(), List.of());
    }

    /** Tin kèm tệp gửi dạng multipart. */
    @PostMapping(value = "/conversations/{id}/messages", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> send(
            @PathVariable Long id,
            @RequestParam(required = false) String body,
            @RequestParam(name = "product_id", required = false) Integer productId,
            @RequestParam(name = "attachments[]", required = false) List<MultipartFile> attachments,
            @RequestParam(name = "attachments", required = false) List<MultipartFile> attachmentsAlt) {
        return deliver(id, body, productId, ImageRules.nonEmpty(attachments != null ? attachments : attachmentsAlt));
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> deliver(Long id, String body, Integer productId,
                                                                      List<MultipartFile> files) {
        Long userId = AccessGuard.currentUser().id();
        chatService.ownedByCustomer(id, userId);
        rateLimiter.check("chat:" + userId, 60);
        validate(body, files);
        Map<String, Object> message = chatService.send(id, ChatService.SIDE_CUSTOMER, userId, body, productId,
                files.isEmpty() ? List.of() : chatService.uploadAttachments(files));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(message));
    }

    private void validate(String body, List<MultipartFile> files) {
        Validator v = new Validator();
        v.check(body == null || body.length() <= 2000, "body", "Tin nhắn không được vượt quá 2000 ký tự");
        v.check(!(body == null || body.isBlank()) || !files.isEmpty(), "body", "Tin nhắn không được để trống.");
        chatService.validateAttachments(v, files);
        v.throwIfFailed();
    }
}
