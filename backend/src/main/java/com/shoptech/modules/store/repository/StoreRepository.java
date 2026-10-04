package com.shoptech.modules.store.repository;

import com.shoptech.modules.store.entity.Store;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {

    List<Store> findByIdIn(Collection<Long> ids);

    List<Store> findBySellerProfileId(Long sellerProfileId, Sort sort);

    boolean existsBySlug(String slug);

    Optional<Store> findFirstBySlugAndStatus(String slug, String status);

    @Query("select s from Store s where :status is null or s.status = :status")
    Page<Store> search(@Param("status") String status, Pageable pageable);

    /** [store_id, count] — số sản phẩm của từng gian hàng */
    @Query("select p.storeId, count(p) from Product p where p.storeId in :ids group by p.storeId")
    List<Object[]> countProducts(@Param("ids") Collection<Long> ids);
}
