package com.shoptech.modules.product.repository;

import com.shoptech.modules.product.document.ProductSpecification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ProductSpecificationRepository extends MongoRepository<ProductSpecification, String> {

    Optional<ProductSpecification> findFirstByProductId(Integer productId);

    void deleteByProductId(Integer productId);
}
