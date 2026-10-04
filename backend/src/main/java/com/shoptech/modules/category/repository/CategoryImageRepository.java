package com.shoptech.modules.category.repository;

import com.shoptech.modules.category.document.CategoryImage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CategoryImageRepository extends MongoRepository<CategoryImage, String> {

    List<CategoryImage> findByCategoryIdIn(Collection<Integer> categoryIds);

    Optional<CategoryImage> findFirstByCategoryId(Integer categoryId);

    void deleteByCategoryId(Integer categoryId);
}
