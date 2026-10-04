package com.shoptech.modules.seller.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.shoptech.modules.seller.entity.SellerApplication;
import com.shoptech.modules.user.dto.UserSummary;

import java.time.Instant;
import java.util.List;

public record SellerApplicationResponse(
        Long id,
        Long userId,
        String shopName,
        String phone,
        String address,
        List<Integer> categoryIds,
        List<String> categoryNames,
        String status,
        String rejectReason,
        Long reviewedBy,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) UserSummary user,
        @JsonInclude(JsonInclude.Include.NON_NULL) Reviewer reviewer
) {

    public record Reviewer(Long id, String name) {
    }

    public static SellerApplicationResponse of(SellerApplication a, List<String> categoryNames,
                                               UserSummary user, Reviewer reviewer) {
        return new SellerApplicationResponse(a.getId(), a.getUserId(), a.getShopName(), a.getPhone(), a.getAddress(),
                a.getCategoryIds() == null ? List.of() : a.getCategoryIds(), categoryNames, a.getStatus(),
                a.getRejectReason(), a.getReviewedBy(), a.getReviewedAt(), a.getCreatedAt(), a.getUpdatedAt(),
                user, reviewer);
    }
}
