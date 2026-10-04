package com.shoptech.modules.customer.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.customer.dto.SellerCustomerDetail;
import com.shoptech.modules.customer.dto.SellerCustomerRow;
import com.shoptech.modules.customer.service.SellerCustomerService;
import com.shoptech.modules.seller.service.SellerContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Seller Center — khách hàng đã mua tại gian hàng. */
@RestController
@RequestMapping("/api/seller/stores/{storeId}/customers")
@RequiredArgsConstructor
public class SellerCustomerController {

    private final SellerContext seller;
    private final SellerCustomerService customerService;

    @GetMapping
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<PagedResult<SellerCustomerRow>> index(
            @PathVariable Long storeId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(customerService.list(seller.store(storeId), search, page, perPage));
    }

    @GetMapping("/{customerId}")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<SellerCustomerDetail> show(@PathVariable Long storeId, @PathVariable Long customerId) {
        return ApiResponse.ok(customerService.detail(seller.store(storeId), customerId));
    }
}
