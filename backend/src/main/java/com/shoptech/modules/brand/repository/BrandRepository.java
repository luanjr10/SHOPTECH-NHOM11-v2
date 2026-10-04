package com.shoptech.modules.brand.repository;

import com.shoptech.modules.brand.entity.Brand;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface BrandRepository extends JpaRepository<Brand, Integer> {

    @Query("""
            select b from Brand b
            where :search is null
               or b.name like concat('%', :search, '%')
               or b.code like concat('%', :search, '%')
            """)
    Page<Brand> search(@Param("search") String search, Pageable pageable);

    boolean existsByCode(String code);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Integer id);

    long countByIdIn(Collection<Integer> ids);
}
