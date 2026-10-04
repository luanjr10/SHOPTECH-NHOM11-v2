package com.shoptech.modules.product.dto;

import com.shoptech.common.util.Numbers;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.store.dto.StoreSummary;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Sản phẩm trong danh sách: thông tin cơ bản + gian hàng + ảnh/thumbnail + giá sau giảm. */
public record ProductResponse(
        Integer id,
        String name,
        String slug,
        BigDecimal price,
        Integer discountPercent,
        boolean isFeatured,
        boolean isFlashSale,
        Integer stock,
        Integer weight,
        Integer length,
        Integer width,
        Integer height,
        Integer status,
        Instant createdAt,
        Instant updatedAt,
        Integer categoryId,
        Long storeId,
        Integer brandId,
        String code,
        StoreSummary store,
        List<String> images,
        String thumbnail,
        BigDecimal finalPrice
) {

    public static ProductResponse of(Product p, StoreSummary store, List<String> images) {
        List<String> imgs = images == null ? List.of() : images;
        return new ProductResponse(
                p.getId(), p.getName(), p.getSlug(), p.getPrice(), p.getDiscountPercent(),
                p.isFeatured(), p.isFlashSale(), p.getStock(), p.getWeight(), p.getLength(), p.getWidth(), p.getHeight(),
                p.getStatus(), p.getCreatedAt(), p.getUpdatedAt(), p.getCategoryId(), p.getStoreId(), p.getBrandId(),
                p.getCode(), store, imgs, imgs.isEmpty() ? null : imgs.get(0),
                Numbers.finalPrice(p.getPrice(), p.getDiscountPercent()));
    }
}
