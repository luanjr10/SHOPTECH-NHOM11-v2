package com.shoptech.modules.cart.repository;

import com.shoptech.modules.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByCartIdOrderByIdAsc(Long cartId);

    Optional<CartItem> findFirstByCartIdAndProductIdAndSku(Long cartId, Integer productId, String sku);

    @Modifying
    @Query("delete from CartItem i where i.cartId = :cartId")
    void deleteByCartId(@Param("cartId") Long cartId);
}
