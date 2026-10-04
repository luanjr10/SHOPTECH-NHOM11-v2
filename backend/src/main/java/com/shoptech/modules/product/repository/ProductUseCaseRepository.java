package com.shoptech.modules.product.repository;

import com.shoptech.modules.product.document.ProductUseCase;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProductUseCaseRepository extends MongoRepository<ProductUseCase, String> {

    Optional<ProductUseCase> findFirstByProductId(Integer productId);

    /** { useCaseIds: id } khớp khi mảng chứa phần tử id. */
    @Query(value = "{ 'useCaseIds': ?0 }", fields = "{ 'productId': 1 }")
    List<ProductUseCase> findByUseCaseId(String useCaseId);

    void deleteByProductId(Integer productId);
}
