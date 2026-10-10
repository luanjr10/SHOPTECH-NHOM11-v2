package com.shoptech.modules.user.entity;

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

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    public static final String ROLE_ADMIN = "admin";
    public static final String ROLE_EMPLOYEE = "employee";
    public static final String ROLE_SELLER = "seller";
    public static final String ROLE_CUSTOMER = "customer";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String username;
    private String email;
    private String phone;
    private String googleId;
    private String googleAvatar;
    private String avatar;

    @Column(nullable = false)
    private Integer tokenVersion = 0;

    private String role = ROLE_CUSTOMER;
    private Instant emailVerifiedAt;
    /** Số dư ShopTech Xu (1 xu = 1đ khi thanh toán). */
    private Integer xuBalance = 0;
    /** Mã dùng trong link affiliate của khách. */
    private String referralCode;
    private String password;
    private String rememberToken;
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
