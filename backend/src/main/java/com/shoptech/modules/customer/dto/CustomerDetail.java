package com.shoptech.modules.customer.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.customer.entity.Address;
import com.shoptech.modules.customer.service.CustomerTiers;
import com.shoptech.modules.order.dto.OrderResponse;
import com.shoptech.modules.user.dto.UserResponse;

import java.math.BigDecimal;
import java.util.List;

/** Chi tiết khách hàng: hồ sơ + địa chỉ, hạng hiện tại, hạng kế tiếp và 30 đơn gần nhất. */
public record CustomerDetail(
        Customer customer,
        String tier,
        String tierLabel,
        BigDecimal totalSpent,
        long ordersCount,
        CustomerTiers.NextTier nextTier,
        List<OrderResponse> orders
) {

    public record Customer(@JsonUnwrapped UserResponse user, List<Address> addresses) {
    }
}
