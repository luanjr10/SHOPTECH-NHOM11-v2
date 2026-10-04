package com.shoptech.modules.review.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.common.response.PagedResult;

/** Danh sách đánh giá của gian hàng (phân trang) kèm điểm trung bình / tổng số đánh giá. */
public record StoreReviewPage(
        @JsonUnwrapped PagedResult<ReviewResponse> page,
        Stats stats
) {

    public record Stats(double average, long count) {
    }
}
