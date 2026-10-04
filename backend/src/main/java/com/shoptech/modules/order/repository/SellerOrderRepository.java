package com.shoptech.modules.order.repository;

import com.shoptech.modules.order.entity.SellerOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SellerOrderRepository extends JpaRepository<SellerOrder, Long> {

    List<SellerOrder> findByOrderIdInOrderByIdAsc(Collection<Long> orderIds);

    Page<SellerOrder> findByStatusIn(Collection<String> statuses, Pageable pageable);
}
