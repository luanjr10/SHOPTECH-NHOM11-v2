package com.shoptech.modules.comment.repository;

import com.shoptech.modules.comment.entity.CategoryComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface CategoryCommentRepository extends JpaRepository<CategoryComment, Long> {

    List<CategoryComment> findByCategoryIdAndParentIdIsNullOrderByCreatedAtDescIdDesc(Integer categoryId);

    List<CategoryComment> findByParentIdInOrderByCreatedAtAscIdAsc(Collection<Long> parentIds);
}
