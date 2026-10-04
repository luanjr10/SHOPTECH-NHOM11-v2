package com.shoptech.modules.coupon.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.coupon.entity.Coupon;

/** Voucher kèm số lượt đã lưu / đã dùng (chỉ có ở danh sách). */
public record CouponResponse(
        @JsonUnwrapped Coupon coupon,
        @JsonInclude(JsonInclude.Include.NON_NULL) Long claimsCount,
        @JsonInclude(JsonInclude.Include.NON_NULL) Long redemptionsCount
) {
}
