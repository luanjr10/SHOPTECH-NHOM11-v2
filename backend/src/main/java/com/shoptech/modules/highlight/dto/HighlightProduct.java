package com.shoptech.modules.highlight.dto;

import java.math.BigDecimal;

public record HighlightProduct(
        Integer id,
        String code,
        String name,
        String thumbnail,
        BigDecimal price,
        Integer discountPercent,
        boolean isFeatured,
        boolean isFlashSale,
        String brand
) {
}
