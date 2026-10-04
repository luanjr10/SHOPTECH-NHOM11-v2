package com.shoptech.modules.comment.repository;

import com.shoptech.modules.comment.entity.ProductComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ProductCommentRepository extends JpaRepository<ProductComment, Long> {

    List<ProductComment> findByProductIdAndParentIdIsNullOrderByCreatedAtDescIdDesc(Integer productId);

    List<ProductComment> findByParentIdInOrderByCreatedAtAscIdAsc(Collection<Long> parentIds);
}
