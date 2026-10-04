package com.shoptech.modules.store.dto;

import java.time.Instant;

/** Một gian hàng trong trang "Gian hàng" (client). */
public record PublicStoreItem(
        Long id,
        String name,
        String slug,
        String logo,
        String description,
        long productsCount,
        long followersCount,
        long reviewsCount,
        double rating,
        Instant createdAt
) {
}
