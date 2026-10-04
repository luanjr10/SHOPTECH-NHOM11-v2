package com.shoptech.modules.seller.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** Ví của người bán — được tạo khi đơn đăng ký bán hàng được duyệt. */
@Entity
@Table(name = "seller_wallets")
@Getter
@Setter
@NoArgsConstructor
public class SellerWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long sellerProfileId;
    private BigDecimal balance = BigDecimal.ZERO;
    private BigDecimal pendingBalance = BigDecimal.ZERO;
    private BigDecimal withdrawableBalance = BigDecimal.ZERO;
    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = updatedAt = Instant.now();
    }
}
