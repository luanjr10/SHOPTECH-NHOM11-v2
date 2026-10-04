package com.shoptech.modules.returns.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.returns.dto.RespondReturnRequest;
import com.shoptech.modules.returns.dto.ReturnRequestView;
import com.shoptech.modules.returns.service.SellerReturnService;
import com.shoptech.modules.seller.service.SellerContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Seller Center — yêu cầu hoàn trả / bảo hành. */
@RestController
@RequestMapping("/api/seller/stores/{storeId}/returns")
@RequiredArgsConstructor
public class SellerReturnController {

    private final SellerContext seller;
    private final SellerReturnService returnService;

    @GetMapping
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<PagedResult<ReturnRequestView>> index(
            @PathVariable Long storeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(returnService.list(seller.store(storeId), status, page, perPage));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<ReturnRequestView> show(@PathVariable Long storeId, @PathVariable Long id) {
        return ApiResponse.ok(returnService.detail(seller.store(storeId), id));
    }

    @PatchMapping("/{id}/respond")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<ReturnRequestView> respond(@PathVariable Long storeId, @PathVariable Long id,
                                                  @RequestBody RespondReturnRequest request) {
        ReturnRequestView result = returnService.respond(seller.store(storeId), id, request);
        return ApiResponse.ok("approved".equals(result.status()) ? "Đã duyệt yêu cầu" : "Đã từ chối yêu cầu", result);
    }
}
