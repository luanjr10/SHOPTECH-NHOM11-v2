package com.shoptech.modules.order.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** Phần đơn hàng thuộc về một gian hàng (một đơn của khách có thể gồm nhiều gian hàng). */
@Entity
@Table(name = "seller_orders")
@Getter
@Setter
@NoArgsConstructor
public class SellerOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderId;
    private Long storeId;
    private Long sellerProfileId;
    private String status;
    private BigDecimal subtotal;
    private BigDecimal shippingFee;
    private BigDecimal commissionRate;
    private BigDecimal commissionAmount;
    private BigDecimal sellerAmount;
    /** Phần giảm giá hàng do chính gian hàng chịu (voucher của gian hàng). */
    private BigDecimal storeDiscount = BigDecimal.ZERO;
    /** Phần phí ship gian hàng hỗ trợ khách (voucher miễn ship của gian hàng). */
    private BigDecimal storeShippingSubsidy = BigDecimal.ZERO;
    private Instant completedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
