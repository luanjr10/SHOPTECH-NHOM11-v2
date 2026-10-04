package com.shoptech.modules.product.entity;

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

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String slug;
    private BigDecimal price;
    private Integer discountPercent = 0;
    private boolean isFeatured;
    private boolean isFlashSale;
    private Integer stock = 0;
    private Integer weight;
    private Integer length;
    private Integer width;
    private Integer height;
    private Integer status = 1;
    private Instant createdAt;
    private Instant updatedAt;
    private Integer categoryId;
    private Long storeId;
    private Integer brandId;
    private String code;

    @PrePersist
    void onCreate() {
        createdAt = updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
