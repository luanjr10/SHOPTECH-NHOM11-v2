package com.shoptech.modules.order.repository;

import com.shoptech.modules.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("select o from Order o where :status is null or o.status = :status")
    Page<Order> search(@Param("status") String status, Pageable pageable);

    List<Order> findTop30ByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Order> findByUserId(Long userId, Pageable pageable);

    Optional<Order> findFirstByPaymentRef(String paymentRef);
}
