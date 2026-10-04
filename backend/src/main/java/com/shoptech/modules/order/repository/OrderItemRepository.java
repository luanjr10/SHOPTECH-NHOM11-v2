package com.shoptech.modules.order.repository;

import com.shoptech.modules.order.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findBySellerOrderIdInOrderByIdAsc(Collection<Long> sellerOrderIds);

    List<OrderItem> findBySellerOrderIdOrderByIdAsc(Long sellerOrderId);
}
