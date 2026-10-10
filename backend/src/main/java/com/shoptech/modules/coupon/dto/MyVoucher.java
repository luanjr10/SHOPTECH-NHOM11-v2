package com.shoptech.modules.coupon.dto;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Voucher hiển thị cho khách ở trang Tài khoản → Hạng & Ưu đãi và ở bước thanh toán.
 * {@code kind}: tier (cần bấm Nhận) | new_customer | daily | trade_in | public (mã công khai của gian hàng).
 */
public record MyVoucher(
        String kind,
        boolean requiresClaim,
        boolean soldOut,
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
        Long storeId,
        String storeName,
        String targetTierLabel,
        Integer perUserLimit,
        int usedCountByMe,
        Integer remainingForMe,
        Instant expiresAt,
        boolean claimed
) {
}
