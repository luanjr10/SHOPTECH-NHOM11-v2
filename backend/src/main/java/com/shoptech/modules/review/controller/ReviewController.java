package com.shoptech.modules.review.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.review.dto.ReviewResponse;
import com.shoptech.modules.review.dto.StoreFollowResponse;
import com.shoptech.modules.review.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/reviews")
    @PreAuthorize("@access.module('reviews', 'view')")
    public ApiResponse<PagedResult<ReviewResponse>> reviews(
            @RequestParam(required = false) Integer rating,
            @RequestParam(name = "store_id", required = false) Long storeId,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(reviewService.reviews(rating, storeId, page, perPage));
    }

    @DeleteMapping("/reviews/{id}")
    @PreAuthorize("@access.module('reviews', 'delete')")
    public ApiResponse<Void> deleteReview(@PathVariable Long id) {
        reviewService.deleteReview(id);
        return ApiResponse.message("Đã xoá đánh giá");
    }

    @GetMapping("/store-follows")
    @PreAuthorize("@access.module('reviews', 'view')")
    public ApiResponse<PagedResult<StoreFollowResponse>> follows(
            @RequestParam(required = false) String search,
            @RequestParam(name = "store_id", required = false) Long storeId,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(reviewService.follows(search, storeId, page, perPage));
    }
}
