package com.shoptech.modules.product.repository;

import com.shoptech.modules.product.entity.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Integer>, JpaSpecificationExecutor<Product> {

    Optional<Product> findFirstBySlug(String slug);

    boolean existsByCode(String code);

    Page<Product> findByStoreId(Long storeId, Pageable pageable);

    Page<Product> findByStoreIdAndStockLessThanEqual(Long storeId, Integer stock, Pageable pageable);

    /** Khoá dòng khi điều chỉnh tồn kho. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Integer id);

    /** [category_id, count] — số sản phẩm của từng danh mục */
    @Query("select p.categoryId, count(p) from Product p where p.categoryId in :ids group by p.categoryId")
    List<Object[]> countByCategory(@Param("ids") Collection<Integer> ids);

    /** [rating, count] — RatingService::productStats */
    @Query(value = "select rating, count(*) from product_reviews where product_id = :productId group by rating",
            nativeQuery = true)
    List<Object[]> ratingBreakdown(@Param("productId") Integer productId);
}
