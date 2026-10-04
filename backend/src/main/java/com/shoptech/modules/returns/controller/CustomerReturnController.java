package com.shoptech.modules.returns.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.returns.dto.CustomerReturnView;
import com.shoptech.modules.returns.entity.ReturnRequest;
import com.shoptech.modules.returns.service.CustomerReturnService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Yêu cầu hoàn trả / bảo hành của khách đang đăng nhập. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CustomerReturnController {

    private final CustomerReturnService returnService;

    @GetMapping("/returns/mine")
    public ApiResponse<PagedResult<CustomerReturnView>> mine(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(returnService.mine(AccessGuard.currentUser().id(), page, perPage));
    }

    @GetMapping("/returns/{id}")
    public ApiResponse<CustomerReturnView> show(@PathVariable Long id) {
        return ApiResponse.ok(returnService.detail(AccessGuard.currentUser().id(), id));
    }

    /** multipart: type (return|warranty), reason, images[] (1–5 ảnh). */
    @PostMapping("/order-items/{orderItemId}/returns")
    public ResponseEntity<ApiResponse<ReturnRequest>> store(
            @PathVariable Long orderItemId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String reason,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images,
            @RequestParam(name = "images", required = false) List<MultipartFile> imagesAlt) {
        ReturnRequest created = returnService.submit(AccessGuard.currentUser().id(), orderItemId, type, reason,
                images != null ? images : imagesAlt);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Đã gửi yêu cầu — seller sẽ phản hồi sớm.", created));
    }
}
