package com.shoptech.modules.platformfund.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Một phần đơn trong quỹ sàn: tiền sàn đang giữ (đơn đang giao/đã giao) hoặc đã quyết toán cho người bán.
 */
public record PlatformFundOrder(
        @JsonUnwrapped SellerOrder sellerOrder,
        @JsonInclude(JsonInclude.Include.NON_NULL) BigDecimal heldAmount,
        @JsonInclude(JsonInclude.Include.NON_NULL) BigDecimal settledAmount,
        boolean customerReceived,
        StoreRef store,
        Seller sellerProfile,
        List<OrderItem> items,
        OrderRef order,
        @JsonInclude(JsonInclude.Include.NON_ABSENT) ShipmentRef shipment
) {

    public record StoreRef(Long id, String name) {
    }

    public record Seller(Long id, String displayName, UserRef user) {
    }

    public record UserRef(Long id, String name, String username) {
    }

    public record OrderRef(Long id, String receiverName, String receiverPhone, String shippingAddress, String paymentMethod) {
    }

    public record ShipmentRef(String status, Instant expectedDeliveryTime, Instant shippedAt) {
    }
}
