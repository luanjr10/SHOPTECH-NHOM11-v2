package com.shoptech.modules.coupon.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** Mã giảm giá: theo %, số tiền cố định hoặc miễn phí vận chuyển; có thể giới hạn theo hạng khách hàng. */
@Entity
@Table(name = "coupons")
@Getter
@Setter
@NoArgsConstructor
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;
    private String title;
    private String description;
    private String type;
    private String targetTier;

    @Column(name = "is_free_ship")
    @JsonProperty("is_free_ship")
    private boolean freeShip;

    private BigDecimal value;
    private BigDecimal maxDiscount;
    private BigDecimal minOrderAmount;
    private Integer usageLimit;
    private Integer perUserLimit;
    private Integer usedCount = 0;
    private Instant expiresAt;

    @Column(name = "is_active")
    @JsonProperty("is_active")
    private boolean active = true;

    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
