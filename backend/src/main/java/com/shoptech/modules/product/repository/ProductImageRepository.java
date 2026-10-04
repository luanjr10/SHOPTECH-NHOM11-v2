package com.shoptech.modules.product.repository;

import com.shoptech.modules.product.document.ProductImage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductImageRepository extends MongoRepository<ProductImage, String> {

    List<ProductImage> findByProductIdIn(Collection<Integer> productIds);

    Optional<ProductImage> findFirstByProductId(Integer productId);

    void deleteByProductId(Integer productId);
}
