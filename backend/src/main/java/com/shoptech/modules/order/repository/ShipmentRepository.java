package com.shoptech.modules.order.repository;

import com.shoptech.modules.order.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ShipmentRepository extends JpaRepository<Shipment, Long> {

    List<Shipment> findBySellerOrderIdIn(Collection<Long> sellerOrderIds);

    Optional<Shipment> findFirstBySellerOrderId(Long sellerOrderId);
}
