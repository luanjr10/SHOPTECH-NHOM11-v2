package com.shoptech.modules.product.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

import java.util.List;
import java.util.Map;

/** Chi tiết sản phẩm: thêm thông số, biến thể, Quick Link và điểm đánh giá. */
public record ProductDetailResponse(
        @JsonUnwrapped ProductResponse product,
        List<Object> specifications,
        List<Map<String, Object>> variants,
        List<String> useCaseIds,
        double rating,
        long reviewsCount
) {
}
