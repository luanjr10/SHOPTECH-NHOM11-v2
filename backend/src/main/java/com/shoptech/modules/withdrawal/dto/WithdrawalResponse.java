package com.shoptech.modules.withdrawal.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.user.dto.UserSummary;
import com.shoptech.modules.withdrawal.entity.WithdrawalRequest;

/** Yêu cầu rút tiền kèm người bán và người duyệt. */
public record WithdrawalResponse(
        @JsonUnwrapped WithdrawalRequest withdrawal,
        @JsonInclude(JsonInclude.Include.NON_NULL) Seller sellerProfile,
        @JsonInclude(JsonInclude.Include.NON_NULL) Reviewer reviewer
) {

    public record Seller(@JsonUnwrapped SellerProfile profile, UserSummary user) {
    }

    public record Reviewer(Long id, String name) {
    }
}
