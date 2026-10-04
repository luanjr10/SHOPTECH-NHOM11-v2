package com.shoptech.modules.usecase.repository;

import com.shoptech.modules.usecase.document.UseCase;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UseCaseRepository extends MongoRepository<UseCase, String> {

    List<UseCase> findByCategoryId(Integer categoryId, Sort sort);

    List<UseCase> findByCategoryIdAndStatus(Integer categoryId, Boolean status, Sort sort);

    Optional<UseCase> findByIdAndCategoryId(String id, Integer categoryId);

    Optional<UseCase> findFirstBySlug(String slug);

    Optional<UseCase> findFirstBySlugAndCategoryId(String slug, Integer categoryId);

    List<UseCase> findByIdInAndCategoryId(Collection<String> ids, Integer categoryId);

    boolean existsByCategoryIdAndSlug(Integer categoryId, String slug);

    boolean existsByCategoryIdAndSlugAndIdNot(Integer categoryId, String slug, String id);
}
