package com.shoptech.modules.customer.dto;

import java.time.Instant;
import java.util.List;

/** Chi tiết một khách của gian hàng: hồ sơ, hạng, chi tiêu và các phần đơn tại gian hàng (tối đa 30). */
public record SellerCustomerDetail(
        Customer customer,
        String tier,
        String tierLabel,
        double totalSpent,
        double storeSpent,
        List<StoreOrder> sellerOrders
) {

    public record Customer(Long id, String name, String username, String email, String phone, String avatarUrl,
                           Instant createdAt) {
    }

    public record StoreOrder(Long id, Long orderId, String status, double totalAmount, Instant createdAt) {
    }
}
