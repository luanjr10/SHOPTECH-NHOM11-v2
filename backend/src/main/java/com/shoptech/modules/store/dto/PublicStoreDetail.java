package com.shoptech.modules.store.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.store.entity.Store;

import java.time.Instant;
import java.util.List;

/** Trang chi tiết gian hàng (client): thông tin gian hàng + chỉ số uy tín + danh mục đang bán. */
public record PublicStoreDetail(
        @JsonUnwrapped Store store,
        long productsCount,
        SellerRef sellerProfile,
        Instant joinedAt,
        List<CategoryRef> categories,
        boolean isFollowing,
        Stats stats
) {

    public record SellerRef(Long id, String displayName, Instant createdAt) {
    }

    public record CategoryRef(Integer id, String name, String slug) {
    }

    public record Stats(
            long completedOrders,
            long totalOrders,
            long orders30d,
            Integer completionRate,
            int complaintRate,
            double rating,
            long ratingCount,
            long followers,
            long productsCount,
            String sellerLevel
    ) {
    }
}
