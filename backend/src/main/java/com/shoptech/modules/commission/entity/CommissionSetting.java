package com.shoptech.modules.commission.entity;

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

/**
 * Tỉ lệ hoa hồng sàn thu trên mỗi đơn. Ưu tiên: theo gian hàng → theo danh mục → mặc định.
 */
@Entity
@Table(name = "commission_settings")
@Getter
@Setter
@NoArgsConstructor
public class CommissionSetting {

    public static final String SCOPE_DEFAULT = "default";
    public static final String SCOPE_CATEGORY = "category";
    public static final String SCOPE_STORE = "store";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String scope;
    private Integer categoryId;
    private Long storeId;
    private BigDecimal rate;
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
