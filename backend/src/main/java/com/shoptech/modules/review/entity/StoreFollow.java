package com.shoptech.modules.review.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Khách hàng theo dõi gian hàng. */
@Entity
@Table(name = "store_follows")
@Getter
@Setter
@NoArgsConstructor
public class StoreFollow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Long storeId;
    private Instant createdAt;
    private Instant updatedAt;
}
