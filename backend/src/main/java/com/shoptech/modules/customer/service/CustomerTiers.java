package com.shoptech.modules.customer.service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Hạng khách hàng theo tổng chi tiêu của các đơn đã hoàn tất:
 * Đồng (0) → Bạc (10 triệu) → Vàng (50 triệu) → Kim Cương (200 triệu).
 */
public final class CustomerTiers {

    public record Tier(String key, String label, BigDecimal minSpent, String color) {
    }

    public record NextTier(String tier, String label, BigDecimal remaining) {
    }

    /** Chỉ đơn ở trạng thái này mới tính vào chi tiêu. */
    public static final String COUNTED_STATUS = "completed";

    public static final List<Tier> TIERS = List.of(
            new Tier("dong", "Đồng", BigDecimal.ZERO, "#a16207"),
            new Tier("bac", "Bạc", BigDecimal.valueOf(10_000_000), "#64748b"),
            new Tier("vang", "Vàng", BigDecimal.valueOf(50_000_000), "#ca8a04"),
            new Tier("kim_cuong", "Kim Cương", BigDecimal.valueOf(200_000_000), "#0891b2"));

    private CustomerTiers() {
    }

    public static Tier resolve(BigDecimal totalSpent) {
        Tier result = TIERS.get(0);
        for (Tier t : TIERS) {
            if (totalSpent.compareTo(t.minSpent()) >= 0) {
                result = t;
            }
        }
        return result;
    }

    public static NextTier next(BigDecimal totalSpent) {
        int index = TIERS.indexOf(resolve(totalSpent));
        if (index + 1 >= TIERS.size()) {
            return null;
        }
        Tier next = TIERS.get(index + 1);
        return new NextTier(next.key(), next.label(), next.minSpent().subtract(totalSpent).max(BigDecimal.ZERO));
    }

    /** [min, max) chi tiêu của một hạng; max = null với hạng cao nhất; null nếu key không hợp lệ. */
    public static BigDecimal[] range(String key) {
        for (int i = 0; i < TIERS.size(); i++) {
            if (TIERS.get(i).key().equals(key)) {
                BigDecimal max = i + 1 < TIERS.size() ? TIERS.get(i + 1).minSpent() : null;
                return new BigDecimal[]{TIERS.get(i).minSpent(), max};
            }
        }
        return null;
    }
}
