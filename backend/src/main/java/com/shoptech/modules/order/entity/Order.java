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

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String status;
    private BigDecimal totalAmount;
    private BigDecimal shippingFee;
    private Instant expectedDeliveryTime;
    private String paymentMethod;
    private String discountCode;
    private BigDecimal discountAmount;
    private Integer xuUsed = 0;
    private String paymentRef;
    private String sepayInvoiceId;
    private String sepayTransactionId;
    private Instant paidAt;
    private String receiverName;
    private String receiverPhone;
    private String shippingAddress;
    private Long ghnProvinceId;
    private String ghnProvinceName;
    private Long ghnDistrictId;
    private String ghnDistrictName;
    private String ghnWardCode;
    private String ghnWardName;
    private Instant createdAt;
    private Instant updatedAt;
}
