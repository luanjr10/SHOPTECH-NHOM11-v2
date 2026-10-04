package com.shoptech.modules.review.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.review.dto.StoreFollowResponse;
import com.shoptech.modules.review.dto.StoreReviewPage;
import com.shoptech.modules.review.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Seller Center — đánh giá sản phẩm và người theo dõi của gian hàng (chỉ xem). */
@RestController
@RequestMapping("/api/seller/stores/{storeId}")
@RequiredArgsConstructor
public class SellerReviewController {

    private final ReviewService reviewService;

    @GetMapping("/reviews")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<StoreReviewPage> reviews(
            @PathVariable Long storeId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(new StoreReviewPage(
                reviewService.reviews(rating, storeId, page, perPage),
                reviewService.storeStats(storeId)));
    }

    @GetMapping("/followers")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<PagedResult<StoreFollowResponse>> followers(
            @PathVariable Long storeId,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(reviewService.follows(null, storeId, page, perPage));
    }
}
