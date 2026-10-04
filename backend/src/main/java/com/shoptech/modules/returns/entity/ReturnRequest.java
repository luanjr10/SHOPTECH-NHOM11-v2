package com.shoptech.modules.returns.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;

/** Yêu cầu hoàn trả / bảo hành của khách cho một sản phẩm trong đơn; người bán duyệt hoặc từ chối. */
@Entity
@Table(name = "return_requests")
@Getter
@Setter
@NoArgsConstructor
public class ReturnRequest {

    public static final String PENDING = "pending";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderItemId;
    private Long sellerOrderId;
    private Long userId;
    /** return | warranty */
    private String type;
    private String reason;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> images;

    /** pending | approved | rejected */
    private String status;
    private String sellerResponse;
    private Instant respondedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
