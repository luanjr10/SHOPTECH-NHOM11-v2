package com.shoptech.modules.order.dto;

import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.entity.Shipment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Đơn hàng của gian hàng trong Seller Center: phần đơn + sản phẩm + thông tin nhận hàng + vận đơn. */
public record SellerOrderView(
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
        List<OrderItem> items,
        OrderInfo order,
        Shipment shipment
) {

    /** Chỉ những trường của đơn gốc mà người bán cần (không lộ mã thanh toán...). */
    public record OrderInfo(
            Long id,
            String status,
            String paymentMethod,
            String receiverName,
            String receiverPhone,
            String shippingAddress,
            Instant expectedDeliveryTime,
            Instant createdAt
    ) {

        public static OrderInfo of(Order o) {
            return o == null ? null : new OrderInfo(o.getId(), o.getStatus(), o.getPaymentMethod(), o.getReceiverName(),
                    o.getReceiverPhone(), o.getShippingAddress(), o.getExpectedDeliveryTime(), o.getCreatedAt());
        }
    }

    public static SellerOrderView of(SellerOrder so, List<OrderItem> items, Order order, Shipment shipment) {
        return new SellerOrderView(so.getId(), so.getOrderId(), so.getStoreId(), so.getStatus(), so.getSubtotal(),
                so.getShippingFee(), so.getCommissionRate(), so.getCommissionAmount(), so.getSellerAmount(),
                so.getCompletedAt(), so.getCreatedAt(), so.getUpdatedAt(), items, OrderInfo.of(order), shipment);
    }
}
