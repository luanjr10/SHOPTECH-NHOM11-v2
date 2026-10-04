package com.shoptech.modules.comment.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.category.repository.CategoryRepository;
import com.shoptech.modules.comment.dto.CommentView;
import com.shoptech.modules.comment.entity.CategoryComment;
import com.shoptech.modules.comment.entity.ProductComment;
import com.shoptech.modules.comment.repository.CategoryCommentRepository;
import com.shoptech.modules.comment.repository.ProductCommentRepository;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.seller.repository.SellerProfileRepository;
import com.shoptech.modules.store.repository.StoreRepository;
import com.shoptech.modules.user.dto.UserSummary;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Bình luận dưới sản phẩm và Hỏi & đáp ở trang danh mục. Chỉ 2 cấp: trả lời một câu trả lời
 * sẽ được gắn vào câu hỏi gốc. Người bán trả lời dưới sản phẩm của chính gian hàng mình được gắn nhãn.
 */
@Service
@RequiredArgsConstructor
public class CommentService {

    private static final int MAX_BODY = 1000;

    private final ProductCommentRepository productCommentRepository;
    private final CategoryCommentRepository categoryCommentRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final StoreRepository storeRepository;
    private final SellerProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final AppProperties props;

    // ------------------------------------------------------------------ sản phẩm

    @Transactional(readOnly = true)
    public List<CommentView> productThread(Integer productId) {
        Product product = product(productId);
        List<ProductComment> roots = productCommentRepository.findByProductIdAndParentIdIsNullOrderByCreatedAtDescIdDesc(productId);
        Map<Long, List<ProductComment>> replies = roots.isEmpty() ? Map.of()
                : productCommentRepository.findByParentIdInOrderByCreatedAtAscIdAsc(roots.stream().map(ProductComment::getId).toList())
                .stream().collect(Collectors.groupingBy(ProductComment::getParentId));
        Map<Long, User> users = users(Stream.concat(roots.stream(), replies.values().stream().flatMap(List::stream))
                .map(ProductComment::getUserId).toList());
        Long sellerUserId = sellerUserIdOf(product);

        return roots.stream().map(c -> view(c, users, sellerUserId,
                replies.getOrDefault(c.getId(), List.of()).stream()
                        .map(r -> view(r, users, sellerUserId, null)).toList())).toList();
    }

    @Transactional
    public CommentView addProductComment(Long userId, Integer productId, String body, Long parentId) {
        Product product = product(productId);
        String text = validBody(body);
        Long rootId = null;
        if (parentId != null) {
            ProductComment parent = productCommentRepository.findById(parentId)
                    .filter(p -> Objects.equals(p.getProductId(), productId))
                    .orElseThrow(() -> ValidationException.of("parent_id", "Bình luận được trả lời không tồn tại"));
            rootId = parent.getParentId() != null ? parent.getParentId() : parent.getId();
        }
        ProductComment comment = new ProductComment();
        comment.setProductId(productId);
        comment.setUserId(userId);
        comment.setParentId(rootId);
        comment.setBody(text);
        productCommentRepository.save(comment);
        return view(comment, users(List.of(userId)), sellerUserIdOf(product), null);
    }

    // ------------------------------------------------------------------ danh mục

    @Transactional(readOnly = true)
    public List<CommentView> categoryThread(Integer categoryId) {
        ensureCategory(categoryId);
        List<CategoryComment> roots = categoryCommentRepository.findByCategoryIdAndParentIdIsNullOrderByCreatedAtDescIdDesc(categoryId);
        Map<Long, List<CategoryComment>> replies = roots.isEmpty() ? Map.of()
                : categoryCommentRepository.findByParentIdInOrderByCreatedAtAscIdAsc(roots.stream().map(CategoryComment::getId).toList())
                .stream().collect(Collectors.groupingBy(CategoryComment::getParentId));
        Map<Long, User> users = users(Stream.concat(roots.stream(), replies.values().stream().flatMap(List::stream))
                .map(CategoryComment::getUserId).toList());

        return roots.stream().map(c -> view(c, users, replies.getOrDefault(c.getId(), List.of()).stream()
                .map(r -> view(r, users, null)).toList())).toList();
    }

    @Transactional
    public CommentView addCategoryComment(Long userId, Integer categoryId, String body, Long parentId) {
        ensureCategory(categoryId);
        String text = validBody(body);
        Long rootId = null;
        if (parentId != null) {
            CategoryComment parent = categoryCommentRepository.findById(parentId)
                    .filter(p -> Objects.equals(p.getCategoryId(), categoryId))
                    .orElseThrow(() -> ValidationException.of("parent_id", "Câu hỏi được trả lời không tồn tại"));
            rootId = parent.getParentId() != null ? parent.getParentId() : parent.getId();
        }
        CategoryComment comment = new CategoryComment();
        comment.setCategoryId(categoryId);
        comment.setUserId(userId);
        comment.setParentId(rootId);
        comment.setBody(text);
        categoryCommentRepository.save(comment);
        return view(comment, users(List.of(userId)), null);
    }

    // ------------------------------------------------------------------ helpers

    private CommentView view(ProductComment c, Map<Long, User> users, Long sellerUserId, List<CommentView> replies) {
        User u = users.get(c.getUserId());
        return new CommentView(c.getId(), c.getProductId(), null, c.getParentId(), c.getBody(), c.getCreatedAt(),
                author(u), u != null && User.ROLE_ADMIN.equals(u.getRole()),
                u != null && User.ROLE_SELLER.equals(u.getRole()) && Objects.equals(u.getId(), sellerUserId), replies);
    }

    private CommentView view(CategoryComment c, Map<Long, User> users, List<CommentView> replies) {
        User u = users.get(c.getUserId());
        return new CommentView(c.getId(), null, c.getCategoryId(), c.getParentId(), c.getBody(), c.getCreatedAt(),
                author(u), u != null && User.ROLE_ADMIN.equals(u.getRole()), null, replies);
    }

    private CommentView.Author author(User u) {
        UserSummary s = UserSummary.of(u, props);
        return s == null ? null : new CommentView.Author(s.id(), s.name(), s.username(), s.avatarUrl());
    }

    /** Chủ gian hàng bán sản phẩm (user_id của hồ sơ người bán). */
    private Long sellerUserIdOf(Product product) {
        if (product.getStoreId() == null) {
            return null;
        }
        return storeRepository.findById(product.getStoreId())
                .flatMap(s -> s.getSellerProfileId() == null ? Optional.empty()
                        : profileRepository.findById(s.getSellerProfileId()))
                .map(SellerProfile::getUserId).orElse(null);
    }

    private Map<Long, User> users(Collection<Long> ids) {
        return userRepository.findAllById(ids.stream().filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private static String validBody(String body) {
        if (body == null || body.isBlank()) {
            throw ValidationException.of("body", "Vui lòng nhập nội dung");
        }
        if (body.length() > MAX_BODY) {
            throw ValidationException.of("body", "Nội dung không được vượt quá " + MAX_BODY + " ký tự");
        }
        return body.trim();
    }

    private Product product(Integer productId) {
        return productRepository.findById(productId).orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));
    }

    private void ensureCategory(Integer categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw ApiException.notFound("Không tìm thấy danh mục");
        }
    }
}
