package com.shoptech.modules.coupon.repository;

import com.shoptech.modules.coupon.entity.Coupon;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    @Query("""
            select c from Coupon c
            where :search is null
               or c.code like concat('%', :search, '%')
               or c.title like concat('%', :search, '%')
            """)
    Page<Coupon> search(@Param("search") String search, Pageable pageable);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    /** [coupon_id, count] — số lượt khách đã lưu mã */
    @Query(value = "select coupon_id, count(*) from coupon_claims where coupon_id in (:ids) group by coupon_id",
            nativeQuery = true)
    List<Object[]> countClaims(@Param("ids") Collection<Long> ids);

    /** [coupon_id, count] — số lần mã đã được dùng trong đơn */
    @Query(value = "select coupon_id, count(*) from coupon_redemptions where coupon_id in (:ids) group by coupon_id",
            nativeQuery = true)
    List<Object[]> countRedemptions(@Param("ids") Collection<Long> ids);
}
