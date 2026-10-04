package com.shoptech.modules.inventory.repository;

import com.shoptech.modules.inventory.entity.StockAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long> {

    List<StockAdjustment> findByProductIdOrderByCreatedAtDescIdDesc(Integer productId);
}
