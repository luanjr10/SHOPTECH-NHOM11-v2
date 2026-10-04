package com.shoptech.modules.order.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.Shipment;
import com.shoptech.modules.returns.entity.ReturnRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Đơn hàng của khách (trang Tài khoản → Đơn hàng). Bản chi tiết có thêm bảo hành,
 * quyền gửi yêu cầu hoàn trả và yêu cầu hoàn trả gần nhất của từng sản phẩm.
 */
public record CustomerOrderView(
        Long id,
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
        Instant createdAt,
        Instant updatedAt,
        List<SellerOrderPart> sellerOrders
) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SellerOrderPart(
            Long id,
            Long orderId,
            Long storeId,
            String status,
            BigDecimal subtotal,
            BigDecimal shippingFee,
            Instant completedAt,
            Instant createdAt,
            StoreRef store,
            List<Item> items,
            Shipment shipment,
            Warranty warranty,
            Boolean canRequestReturn
    ) {
    }

    public record StoreRef(Long id, String name, String slug) {
    }

    public record Item(@JsonUnwrapped OrderItem item,
                       @JsonInclude(JsonInclude.Include.NON_ABSENT) ReturnRequest returnRequest) {
    }

    /** status: chua_ap_dung | con_han | het_han */
    public record Warranty(boolean applicable, String status, String label, Instant expiresAt, Instant purchasedAt) {
    }
}
