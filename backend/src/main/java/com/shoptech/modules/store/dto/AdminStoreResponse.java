package com.shoptech.modules.store.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.user.dto.UserSummary;

/** Gian hàng trong trang quản trị: kèm số sản phẩm và chủ gian hàng. */
public record AdminStoreResponse(
        @JsonUnwrapped Store store,
        long productsCount,
        Owner sellerProfile
) {

    public record Owner(@JsonUnwrapped SellerProfile profile, UserSummary user) {
    }
}
