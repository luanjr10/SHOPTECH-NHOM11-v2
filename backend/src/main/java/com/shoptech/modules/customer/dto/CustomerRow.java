package com.shoptech.modules.customer.dto;

import java.math.BigDecimal;
import java.time.Instant;

/** Một dòng trong danh sách khách hàng kèm tổng chi tiêu và hạng. */
public record CustomerRow(
        Long id,
        String name,
        String username,
        String email,
        String phone,
        String avatarUrl,
        Instant createdAt,
        BigDecimal totalSpent,
        long ordersCount,
        String tier,
        String tierLabel
) {
}
