package com.shoptech.modules.review.dto;

import com.shoptech.modules.review.entity.ProductReview;
import com.shoptech.modules.user.dto.UserSummary;

import java.time.Instant;
import java.util.List;

public record ReviewResponse(
        Long id,
        Integer productId,
        Long userId,
        Long orderItemId,
        Integer rating,
        String comment,
        List<String> images,
        boolean isVerifiedPurchase,
        Instant createdAt,
        Instant updatedAt,
        ProductRef product,
        UserSummary user
) {

    public record StoreRef(Long id, String name) {
    }

    public record ProductRef(Integer id, String name, Long storeId, StoreRef store) {
    }

    public static ReviewResponse of(ProductReview r, ProductRef product, UserSummary user) {
        return new ReviewResponse(r.getId(), r.getProductId(), r.getUserId(), r.getOrderItemId(), r.getRating(),
                r.getComment(), r.getImages(), r.getOrderItemId() != null, r.getCreatedAt(), r.getUpdatedAt(),
                product, user);
    }
}
