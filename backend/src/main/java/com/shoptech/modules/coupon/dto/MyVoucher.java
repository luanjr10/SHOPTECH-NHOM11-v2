package com.shoptech.modules.coupon.dto;

import java.math.BigDecimal;
import java.time.Instant;

/** Voucher theo hạng thành viên hiển thị ở trang Tài khoản → Hạng & Ưu đãi. */
public record MyVoucher(
        Long id,
        String code,
        String title,
        String description,
        String type,
        boolean isFreeShip,
        BigDecimal value,
        BigDecimal maxDiscount,
        BigDecimal minOrderAmount,
        String targetTier,
        String targetTierLabel,
        Integer perUserLimit,
        int usedCountByMe,
        Integer remainingForMe,
        Instant expiresAt,
        boolean claimed
) {
}
