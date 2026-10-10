package com.shoptech.modules.product.service;

import com.shoptech.modules.product.entity.Product;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Giá bán và tồn kho thực tế của một sản phẩm / biến thể (SKU):
 * có biến thể khớp SKU thì lấy giá + tồn kho của biến thể, không thì lấy giá sau giảm + tồn kho sản phẩm.
 * {@code variants} là danh sách biến thể đã giải mã từ product_specifications (Json#mapListOf).
 */
public final class ProductPricing {

    private ProductPricing() {
    }

    public static BigDecimal unitPrice(Product product, List<Map<String, Object>> variants, String sku) {
        Map<String, Object> variant = findVariant(variants, sku);
        if (variant != null) {
            return decimal(variant.get("price")).setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal price = product.getPrice() == null ? BigDecimal.ZERO : product.getPrice();
        int discount = product.getDiscountPercent() == null ? 0 : product.getDiscountPercent();
        return price.subtract(price.multiply(BigDecimal.valueOf(discount)).movePointLeft(2))
                .setScale(2, RoundingMode.HALF_UP);
    }

    public static int stock(Product product, List<Map<String, Object>> variants, String sku) {
        Map<String, Object> variant = findVariant(variants, sku);
        if (variant != null) {
            return decimal(variant.get("stock")).intValue();
        }
        return product.getStock() == null ? 0 : product.getStock();
    }

    public static Map<String, Object> findVariant(List<Map<String, Object>> variants, String sku) {
        if (sku == null || sku.isBlank() || variants == null) {
            return null;
        }
        return variants.stream().filter(v -> Objects.equals(sku, v.get("sku"))).findFirst().orElse(null);
    }

    private static BigDecimal decimal(Object value) {
        if (value instanceof Number n) {
            return new BigDecimal(n.toString());
        }
        try {
            return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString().trim());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}
