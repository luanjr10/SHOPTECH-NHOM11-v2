package com.shoptech.modules.dashboard.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.dashboard.dto.SellerDashboardSummary;
import com.shoptech.modules.dashboard.dto.SellerRevenueSummary;
import com.shoptech.modules.dashboard.service.SellerDashboardService;
import com.shoptech.modules.dashboard.service.SellerRevenueService;
import com.shoptech.modules.seller.service.SellerContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Seller Center — tổng quan gian hàng. */
@RestController
@RequestMapping("/api/seller/stores/{storeId}")
@RequiredArgsConstructor
public class SellerDashboardController {

    private final SellerContext seller;
    private final SellerDashboardService dashboardService;
    private final SellerRevenueService revenueService;

    @GetMapping("/dashboard")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<SellerDashboardSummary> summary(@PathVariable Long storeId) {
        return ApiResponse.ok(dashboardService.summary(seller.store(storeId)));
    }

    @GetMapping("/revenue")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<SellerRevenueSummary> revenue(
            @PathVariable Long storeId,
            @RequestParam(required = false) Integer days) {
        return ApiResponse.ok(revenueService.summary(seller.store(storeId), days));
    }
}
