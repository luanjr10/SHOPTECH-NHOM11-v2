package com.shoptech.modules.category.repository;

import com.shoptech.modules.category.entity.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Integer> {

    @Query("""
            select c from Category c
            where (:search is null or c.name like concat('%', :search, '%') or c.code like concat('%', :search, '%'))
              and (:filterParent = false
                   or (:parentId is null and c.parentId is null)
                   or c.parentId = :parentId)
            """)
    Page<Category> search(@Param("search") String search,
                          @Param("filterParent") boolean filterParent,
                          @Param("parentId") Integer parentId,
                          Pageable pageable);

    List<Category> findByParentIdInAndStatusOrderByStatusOrderAsc(Collection<Integer> parentIds, Integer status);

    List<Category> findByParentIdIn(Collection<Integer> parentIds);

    boolean existsByParentId(Integer parentId);

    boolean existsByCode(String code);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Integer id);

    /** [parent_id, count] — số danh mục con của từng danh mục */
    @Query("select c.parentId, count(c) from Category c where c.parentId in :ids group by c.parentId")
    List<Object[]> countChildren(@Param("ids") Collection<Integer> ids);

    // --- pivot category_brand ---

    @Query(value = "select cb.category_id, b.id, b.code, b.name, b.logo from category_brand cb "
            + "join brands b on b.id = cb.brand_id where cb.category_id in (:ids)", nativeQuery = true)
    List<Object[]> findBrandsOfCategories(@Param("ids") Collection<Integer> ids);

    @Query(value = "select brand_id from category_brand where category_id = :id", nativeQuery = true)
    List<Integer> findBrandIds(@Param("id") Integer id);

    @Modifying
    @Query(value = "delete from category_brand where category_id = :id", nativeQuery = true)
    void detachBrands(@Param("id") Integer id);

    @Modifying
    @Query(value = "insert into category_brand (category_id, brand_id) values (:categoryId, :brandId)", nativeQuery = true)
    void attachBrand(@Param("categoryId") Integer categoryId, @Param("brandId") Integer brandId);
}
