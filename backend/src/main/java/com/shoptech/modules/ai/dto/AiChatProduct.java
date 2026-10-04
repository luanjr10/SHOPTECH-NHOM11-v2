package com.shoptech.modules.ai.dto;

import java.math.BigDecimal;

/** Sản phẩm thật chatbot tìm được (hiển thị thành thẻ sản phẩm trong khung chat). */
public record AiChatProduct(
        Integer id,
        String name,
        String slug,
        BigDecimal price,
        Integer discountPercent,
        BigDecimal finalPrice,
        String thumbnail,
        Integer stock,
        String category,
        String brand,
        String store
) {
}
