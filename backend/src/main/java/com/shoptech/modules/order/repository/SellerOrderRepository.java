package com.shoptech.modules.order.repository;

import com.shoptech.modules.order.entity.SellerOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SellerOrderRepository extends JpaRepository<SellerOrder, Long> {

    List<SellerOrder> findByOrderIdInOrderByIdAsc(Collection<Long> orderIds);

    Page<SellerOrder> findByStatusIn(Collection<String> statuses, Pageable pageable);

    @Query("select so from SellerOrder so where so.storeId = :storeId and (:status is null or so.status = :status)")
    Page<SellerOrder> searchByStore(@Param("storeId") Long storeId, @Param("status") String status, Pageable pageable);

    List<SellerOrder> findByOrderId(Long orderId);

    /** Khoá dòng khi đổi trạng thái để hai thao tác đồng thời không chồng nhau. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select so from SellerOrder so where so.id = :id")
    Optional<SellerOrder> findByIdForUpdate(@Param("id") Long id);
}
