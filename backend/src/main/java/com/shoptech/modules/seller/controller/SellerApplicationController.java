package com.shoptech.modules.seller.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.seller.dto.SellerApplicationResponse;
import com.shoptech.modules.seller.service.SellerApplicationService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/seller-applications")
@RequiredArgsConstructor
public class SellerApplicationController {

    private final SellerApplicationService applicationService;

    @GetMapping
    @PreAuthorize("@access.module('seller_applications', 'view')")
    public ApiResponse<PagedResult<SellerApplicationResponse>> index(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(applicationService.list(status, page, perPage));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@access.module('seller_applications', 'view')")
    public ApiResponse<SellerApplicationResponse> show(@PathVariable Long id) {
        return ApiResponse.ok(applicationService.detail(id));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("@access.module('seller_applications', 'edit')")
    public ApiResponse<SellerApplicationResponse> approve(@PathVariable Long id) {
        return ApiResponse.ok("Đã duyệt đơn — người dùng trở thành người bán",
                applicationService.approve(id, AccessGuard.currentUser().id()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("@access.module('seller_applications', 'edit')")
    public ApiResponse<SellerApplicationResponse> reject(@PathVariable Long id,
                                                         @RequestBody(required = false) Map<String, String> body) {
        String reason = body == null ? null : body.get("reject_reason");
        return ApiResponse.ok("Đã từ chối đơn đăng ký",
                applicationService.reject(id, reason, AccessGuard.currentUser().id()));
    }
}
