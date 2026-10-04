package com.shoptech.modules.customer.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Địa chỉ nhận hàng của khách. */
@Entity
@Table(name = "addresses")
@Getter
@Setter
@NoArgsConstructor
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String recipientName;
    private String phone;
    private Long provinceCode;
    private String provinceName;
    private Long wardCode;
    private String wardName;
    private Long provinceIdGhn;
    private String provinceNameGhn;
    private Long districtId;
    private String districtName;
    private String wardCodeGhn;
    private String wardNameGhn;
    private String addressLine;
    @Column(name = "is_default")
    @JsonProperty("is_default")
    private boolean defaultAddress;
    private Instant createdAt;
    private Instant updatedAt;
}
