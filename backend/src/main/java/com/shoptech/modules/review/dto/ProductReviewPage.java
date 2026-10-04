package com.shoptech.modules.review.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.common.response.PagedResult;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Đánh giá của một sản phẩm trên trang chi tiết: trang đánh giá + điểm trung bình và phân bố số sao. */
public record ProductReviewPage(
        @JsonUnwrapped PagedResult<Item> page,
        Stats stats
) {

    public record Item(Long id, Integer productId, Integer rating, String comment, List<String> images,
                       boolean isVerifiedPurchase, Instant createdAt, Reviewer user) {
    }

    public record Reviewer(Long id, String name, String username, String avatarUrl) {
    }

    /** breakdown: số đánh giá theo từng mức sao 5 → 1 */
    public record Stats(double average, long count, Map<Integer, Long> breakdown) {
    }
}
