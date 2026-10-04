package com.shoptech.modules.product.service;

import com.shoptech.common.util.Numbers;
import com.shoptech.modules.product.entity.Product;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Chuẩn hoá biến thể sản phẩm (SKU, thuộc tính, giá, tồn kho) trước khi lưu. */
final class ProductCatalogSupport {

    private static final List<String> ATTRIBUTE_KEYS = List.of("color", "storage", "ram", "cpu");

    private ProductCatalogSupport() {
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> normalizeVariants(List<Map<String, Object>> rawVariants, Product product) {
        List<Map<String, Object>> variants = new ArrayList<>();
        for (Map<String, Object> raw : rawVariants) {
            Map<String, Object> rawAttrs = raw.get("attributes") instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
            Map<String, Object> attributes = new LinkedHashMap<>();
            for (String key : ATTRIBUTE_KEYS) {
                Object value = rawAttrs.get(key) != null ? rawAttrs.get(key) : raw.get(key);
                String s = value == null ? "" : value.toString().trim();
                if (!s.isEmpty()) {
                    attributes.put(key, s);
                }
            }
            String sku = raw.get("sku") == null ? "" : raw.get("sku").toString().trim();
            boolean hasContent = !sku.isEmpty() || !attributes.isEmpty() || raw.get("price") != null || raw.get("stock") != null;
            if (!hasContent) {
                continue;
            }
            BigDecimal price = raw.get("price") != null ? Numbers.toDecimal(raw.get("price")) : product.getPrice();
            Integer stock = raw.get("stock") != null ? Numbers.toInt(raw.get("stock")) : product.getStock();

            Map<String, Object> variant = new LinkedHashMap<>();
            variant.put("sku", sku.isEmpty() ? generateSku(product, variants.size()) : sku);
            variant.put("attributes", attributes);
            variant.put("price", toDouble(price));
            variant.put("stock", stock == null ? 0 : stock);
            variants.add(variant);
        }
        if (variants.isEmpty()) {
            variants.add(defaultVariant(product));
        }
        return variants;
    }

    static List<Map<String, Object>> resolveVariants(List<Map<String, Object>> stored, Product product) {
        return stored != null && !stored.isEmpty() ? stored : List.of(defaultVariant(product));
    }

    static Map<String, Object> defaultVariant(Product product) {
        Map<String, Object> variant = new LinkedHashMap<>();
        variant.put("sku", generateSku(product, 0));
        variant.put("attributes", new LinkedHashMap<>());
        variant.put("price", toDouble(Numbers.finalPrice(product.getPrice(), product.getDiscountPercent())));
        variant.put("stock", product.getStock() == null ? 0 : product.getStock());
        return variant;
    }

    private static String generateSku(Product product, int index) {
        return product.getCode() + "-" + (index + 1);
    }

    /** Giá biến thể lưu dạng số thực trong Mongo; giữ nguyên kiểu để dữ liệu cũ/mới đồng nhất. */
    private static double toDouble(BigDecimal value) {
        return value == null ? 0d : value.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
