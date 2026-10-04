package com.shoptech.modules.customer.dto;

import java.time.Instant;

/** Khách đã từng mua ở gian hàng: chi tiêu tại gian hàng + tổng chi tiêu toàn sàn (xếp hạng). */
public record SellerCustomerRow(
        Long id,
        String name,
        String username,
        String email,
        String phone,
        double storeSpent,
        long storeOrdersCount,
        Instant lastOrderAt,
        double totalSpent,
        String tier,
        String tierLabel
) {
}
