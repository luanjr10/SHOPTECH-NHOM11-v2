package com.shoptech.modules.comment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * Một bình luận (sản phẩm hoặc danh mục) kèm người viết và nhãn "Quản trị viên" / "Người bán".
 * productId / categoryId / isSellerOfStore chỉ có ở loại tương ứng.
 */
public record CommentView(
        Long id,
        @JsonInclude(JsonInclude.Include.NON_NULL) Integer productId,
        @JsonInclude(JsonInclude.Include.NON_NULL) Integer categoryId,
        Long parentId,
        String body,
        Instant createdAt,
        Author user,
        boolean isAdmin,
        @JsonInclude(JsonInclude.Include.NON_NULL) Boolean isSellerOfStore,
        @JsonInclude(JsonInclude.Include.NON_NULL) List<CommentView> replies
) {

    public record Author(Long id, String name, String username, String avatarUrl) {
    }
}
