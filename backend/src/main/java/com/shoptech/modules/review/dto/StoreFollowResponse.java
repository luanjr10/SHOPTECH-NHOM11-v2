package com.shoptech.modules.review.dto;

import com.shoptech.modules.user.dto.UserSummary;

import java.time.Instant;

public record StoreFollowResponse(
        Long id,
        Long userId,
        Long storeId,
        Instant createdAt,
        Instant updatedAt,
        UserSummary user,
        StoreRef store
) {

    public record StoreRef(Long id, String name, String slug) {
    }
}
