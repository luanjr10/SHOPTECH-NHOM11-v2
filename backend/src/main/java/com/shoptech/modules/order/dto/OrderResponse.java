package com.shoptech.modules.order.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.user.dto.UserSummary;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Đơn hàng của khách kèm các phần đơn theo gian hàng. */
public record OrderResponse(
        Long id,
        Long userId,
        String status,
        BigDecimal totalAmount,
        BigDecimal shippingFee,
        Instant expectedDeliveryTime,
        String paymentMethod,
        String discountCode,
        BigDecimal discountAmount,
        Instant paidAt,
        String receiverName,
        String receiverPhone,
        String shippingAddress,
        String ghnProvinceName,
        String ghnDistrictName,
        String ghnWardName,
        Instant createdAt,
        Instant updatedAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) UserSummary user,
        List<SellerOrderResponse> sellerOrders
) {

    public static OrderResponse of(Order o, UserSummary user, List<SellerOrderResponse> sellerOrders) {
        return new OrderResponse(o.getId(), o.getUserId(), o.getStatus(), o.getTotalAmount(), o.getShippingFee(),
                o.getExpectedDeliveryTime(), o.getPaymentMethod(), o.getDiscountCode(), o.getDiscountAmount(),
                o.getPaidAt(), o.getReceiverName(), o.getReceiverPhone(), o.getShippingAddress(),
                o.getGhnProvinceName(), o.getGhnDistrictName(), o.getGhnWardName(),
                o.getCreatedAt(), o.getUpdatedAt(), user, sellerOrders);
    }

    public record StoreRef(Long id, String name) {
    }

    public record SellerOrderResponse(
            Long id,
            Long orderId,
            Long storeId,
            String status,
            BigDecimal subtotal,
            BigDecimal shippingFee,
            BigDecimal commissionRate,
            BigDecimal commissionAmount,
            BigDecimal sellerAmount,
            Instant completedAt,
            Instant createdAt,
            Instant updatedAt,
            StoreRef store,
            @JsonInclude(JsonInclude.Include.NON_NULL) List<OrderItem> items
    ) {

        public static SellerOrderResponse of(SellerOrder so, StoreRef store, List<OrderItem> items) {
            return new SellerOrderResponse(so.getId(), so.getOrderId(), so.getStoreId(), so.getStatus(),
                    so.getSubtotal(), so.getShippingFee(), so.getCommissionRate(), so.getCommissionAmount(),
                    so.getSellerAmount(), so.getCompletedAt(), so.getCreatedAt(), so.getUpdatedAt(), store, items);
        }
    }
}
