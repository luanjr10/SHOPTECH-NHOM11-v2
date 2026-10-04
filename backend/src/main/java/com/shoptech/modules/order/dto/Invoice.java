package com.shoptech.modules.order.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Dữ liệu hoá đơn dùng để dựng file PDF và email. */
public record Invoice(
        String invoiceNo,
        Instant issuedAt,
        String status,
        String statusLabel,
        Party customer,
        Party receiver,
        String paymentMethod,
        Instant paidAt,
        Instant createdAt,
        List<Group> groups,
        BigDecimal subtotal,
        BigDecimal shippingFee,
        BigDecimal discountAmount,
        String discountCode,
        BigDecimal total
) {

    public record Party(String name, String email, String phone, String address) {
    }

    /** Nhóm sản phẩm theo gian hàng. */
    public record Group(String storeName, String status, String statusLabel, List<Line> items,
                        BigDecimal subtotal, BigDecimal shippingFee) {
    }

    public record Line(String name, String sku, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {
    }
}
