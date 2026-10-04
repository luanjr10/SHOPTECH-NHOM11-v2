package com.shoptech.modules.seller.repository;

import com.shoptech.modules.seller.entity.SellerApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SellerApplicationRepository extends JpaRepository<SellerApplication, Long> {

    @Query("select a from SellerApplication a where :status is null or a.status = :status")
    Page<SellerApplication> search(@Param("status") String status, Pageable pageable);

    List<SellerApplication> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    boolean existsByUserIdAndStatus(Long userId, String status);
}
