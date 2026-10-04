package com.shoptech.modules.inventory.entity;

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

import java.time.Instant;

/** Nhật ký điều chỉnh tồn kho (nhập thêm / xuất, hao hụt) do seller thực hiện. */
@Entity
@Table(name = "stock_adjustments")
@Getter
@Setter
@NoArgsConstructor
public class StockAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long storeId;
    private Integer productId;
    private Long sellerProfileId;
    private Integer previousStock;

    /** "change" là từ khoá của MySQL nên phải đặt trong dấu `. */
    @Column(name = "`change`")
    private Integer change;

    private Integer newStock;
    private String reason;
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
