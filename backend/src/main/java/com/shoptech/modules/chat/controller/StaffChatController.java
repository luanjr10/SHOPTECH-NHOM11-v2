package com.shoptech.modules.chat.controller;

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
import org.springframework.security.access.prepost.PreAuthorize;
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

/**
 * Hộp thư phía quản trị: gian hàng trả lời khách của mình (Seller Center) và đội hỗ trợ ShopTech trả lời
 * các hội thoại không thuộc gian hàng nào (store_id rỗng).
 */
@RestController
@RequiredArgsConstructor
public class StaffChatController {

    private final ChatService chatService;
    private final RateLimiter rateLimiter;

    // ------------------------------------------------------------------ gian hàng

    @GetMapping("/api/seller/stores/{storeId}/chat/conversations")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, Object>> storeInbox(@PathVariable Long storeId) {
        return ApiResponse.ok(inbox(storeId));
    }

    @GetMapping("/api/seller/stores/{storeId}/chat/conversations/{id}/messages")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, Object>> storeMessages(@PathVariable Long storeId, @PathVariable Long id,
                                                          @RequestParam(name = "after_id", required = false) Long afterId) {
        return ApiResponse.ok(thread(chatService.ownedByStore(id, storeId), id, afterId));
    }

    public record TextRequest(String body) {
    }

    @PostMapping(value = "/api/seller/stores/{storeId}/chat/conversations/{id}/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("@seller.owns(#storeId)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> storeSendText(@PathVariable Long storeId, @PathVariable Long id,
                                                                          @RequestBody TextRequest request) {
        chatService.ownedByStore(id, storeId);
        return reply(id, request.body(), null);
    }

    @PostMapping(value = "/api/seller/stores/{storeId}/chat/conversations/{id}/messages", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@seller.owns(#storeId)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> storeSend(
            @PathVariable Long storeId, @PathVariable Long id, @RequestParam(required = false) String body,
            @RequestParam(name = "attachments[]", required = false) List<MultipartFile> attachments,
            @RequestParam(name = "attachments", required = false) List<MultipartFile> attachmentsAlt) {
        chatService.ownedByStore(id, storeId);
        return reply(id, body, attachments != null ? attachments : attachmentsAlt);
    }

    // ------------------------------------------------------------------ hỗ trợ ShopTech

    @GetMapping("/api/admin/chat/conversations")
    @PreAuthorize("@access.module('support_chat', 'view')")
    public ApiResponse<Map<String, Object>> supportInbox() {
        return ApiResponse.ok(inbox(null));
    }

    @GetMapping("/api/admin/chat/conversations/{id}/messages")
    @PreAuthorize("@access.module('support_chat', 'view')")
    public ApiResponse<Map<String, Object>> supportMessages(@PathVariable Long id,
                                                            @RequestParam(name = "after_id", required = false) Long afterId) {
        return ApiResponse.ok(thread(chatService.ownedByStore(id, null), id, afterId));
    }

    @PostMapping(value = "/api/admin/chat/conversations/{id}/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("@access.module('support_chat', 'edit')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> supportSendText(@PathVariable Long id, @RequestBody TextRequest request) {
        chatService.ownedByStore(id, null);
        return reply(id, request.body(), null);
    }

    @PostMapping(value = "/api/admin/chat/conversations/{id}/messages", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@access.module('support_chat', 'edit')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> supportSend(
            @PathVariable Long id, @RequestParam(required = false) String body,
            @RequestParam(name = "attachments[]", required = false) List<MultipartFile> attachments,
            @RequestParam(name = "attachments", required = false) List<MultipartFile> attachmentsAlt) {
        chatService.ownedByStore(id, null);
        return reply(id, body, attachments != null ? attachments : attachmentsAlt);
    }

    // ------------------------------------------------------------------ chung

    private Map<String, Object> inbox(Long storeId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("conversations", chatService.conversationsOfStore(storeId));
        data.put("unread_total", chatService.unreadForStore(storeId));
        return data;
    }

    private Map<String, Object> thread(Map<String, Object> conversation, Long id, Long afterId) {
        List<Map<String, Object>> messages = chatService.messages(id, afterId == null ? 0 : afterId);
        chatService.markRead(id, ChatService.SIDE_STORE);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("customer", chatService.customerOfConversation(conversation));
        data.put("messages", messages);
        return data;
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> reply(Long id, String body, List<MultipartFile> rawFiles) {
        Long userId = AccessGuard.currentUser().id();
        rateLimiter.check("chat:" + userId, 60);
        List<MultipartFile> files = ImageRules.nonEmpty(rawFiles);
        Validator v = new Validator();
        v.check(body == null || body.length() <= 2000, "body", "Tin nhắn không được vượt quá 2000 ký tự");
        v.check(!(body == null || body.isBlank()) || !files.isEmpty(), "body", "Tin nhắn không được để trống.");
        chatService.validateAttachments(v, files);
        v.throwIfFailed();
        Map<String, Object> message = chatService.send(id, ChatService.SIDE_STORE, userId, body, null,
                files.isEmpty() ? List.of() : chatService.uploadAttachments(files));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(message));
    }
}
