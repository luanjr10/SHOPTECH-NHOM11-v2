package com.shoptech.modules.cart.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Giỏ hàng trả về client. Dòng hết hàng / vượt tồn kho vẫn hiển thị (để khách sửa)
 * nhưng không cộng vào tổng số lượng và tạm tính.
 */
public record CartSummary(
        List<Line> items,
        int totalItem,
        int totalQuantity,
        BigDecimal subtotal
) {

    public static CartSummary empty() {
        return new CartSummary(List.of(), 0, 0, BigDecimal.ZERO);
    }

    public record Line(
            Long id,
            ProductRef product,
            Variant variant,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal subtotal,
            int availableStock,
            boolean unavailable,
            boolean stockInsufficient
    ) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ProductRef(Integer id, String name, String slug, String thumbnail, Long storeId) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Variant(String sku, Object attributes) {

        public static Variant of(String sku, Map<String, Object> variant) {
            Object attrs = variant == null ? null : variant.get("attributes");
            return new Variant(sku, attrs == null ? List.of() : attrs);
        }
    }
}
