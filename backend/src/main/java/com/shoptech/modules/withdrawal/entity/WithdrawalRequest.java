package com.shoptech.modules.withdrawal.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** Yêu cầu rút tiền của người bán; admin duyệt (chuyển khoản) hoặc giải ngân qua cổng thanh toán. */
@Entity
@Table(name = "withdrawal_requests")
@Getter
@Setter
@NoArgsConstructor
public class WithdrawalRequest {

    public static final String PENDING = "pending";
    public static final String APPROVED = "approved";
    public static final String REJECTED = "rejected";
    /** Chuyển khoản ngân hàng thủ công — duyệt trực tiếp, không qua cổng thanh toán. */
    public static final String METHOD_BANK = "cod";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long sellerProfileId;
    private BigDecimal amount;
    private String method;
    private String status;
    private String bankAccount;
    private String bankName;
    private String note;
    private String payoutReference;
    private Instant paidAt;
    private Long reviewedBy;
    private Instant reviewedAt;
    private Instant createdAt;
    private Instant updatedAt;

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
