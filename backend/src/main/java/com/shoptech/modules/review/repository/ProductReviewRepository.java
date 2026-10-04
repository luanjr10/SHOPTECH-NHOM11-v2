package com.shoptech.modules.review.repository;

import com.shoptech.modules.review.entity.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    @Query("""
            select r from ProductReview r
            where (:rating is null or r.rating = :rating)
              and (:storeId is null or r.productId in (select p.id from Product p where p.storeId = :storeId))
            """)
    Page<ProductReview> search(@Param("rating") Integer rating, @Param("storeId") Long storeId, Pageable pageable);

    /** Đánh giá của một sản phẩm, lọc số sao / chỉ đánh giá từ người đã mua (order_item_id khác null). */
    @Query("""
            select r from ProductReview r
            where r.productId = :productId
              and (:rating is null or r.rating = :rating)
              and (:verifiedOnly = false or r.orderItemId is not null)
            """)
    Page<ProductReview> searchByProduct(@Param("productId") Integer productId, @Param("rating") Integer rating,
                                        @Param("verifiedOnly") boolean verifiedOnly, Pageable pageable);

    Optional<ProductReview> findFirstByProductIdAndUserId(Integer productId, Long userId);

    /** [count, avg rating] mọi đánh giá của sản phẩm thuộc gian hàng. */
    @Query("select count(r), avg(r.rating) from ProductReview r where r.productId in (select p.id from Product p where p.storeId = :storeId)")
    List<Object[]> storeStats(@Param("storeId") Long storeId);
}
