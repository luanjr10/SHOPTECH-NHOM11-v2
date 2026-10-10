package com.shoptech.modules.review.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.xu.service.XuService;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.review.dto.ProductReviewPage;
import com.shoptech.modules.review.entity.ProductReview;
import com.shoptech.modules.review.repository.ProductReviewRepository;
import com.shoptech.modules.user.dto.UserSummary;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Đánh giá sản phẩm phía khách: xem (lọc số sao / đã mua hàng) và gửi đánh giá.
 * Mỗi khách một đánh giá cho mỗi sản phẩm — gửi lại thì cập nhật; có đơn đã hoàn tất thì gắn nhãn "Đã mua hàng".
 */
@Service
@RequiredArgsConstructor
public class ProductReviewService {

    private static final int PER_PAGE = 10;
    private static final int MAX_IMAGES = 5;
    private static final String IMAGE_FOLDER = "reviews-shoptech";

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final NamedParameterJdbcTemplate jdbc;
    private final AppProperties props;
    private final XuService xuService;

    public record Submitted(ProductReviewPage.Item review, boolean created) {
    }

    @Transactional(readOnly = true)
    public ProductReviewPage list(Integer productId, Integer rating, boolean verifiedOnly, Integer page, Integer perPage) {
        ensureProduct(productId);
        Page<ProductReview> result = reviewRepository.searchByProduct(productId, rating, verifiedOnly,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending().and(Sort.by("id").descending())));
        Map<Long, User> users = userRepository.findAllById(result.getContent().stream().map(ProductReview::getUserId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        List<ProductReviewPage.Item> items = result.getContent().stream()
                .map(r -> item(r, users.get(r.getUserId()))).toList();
        return new ProductReviewPage(PagedResult.of(new PageImpl<>(items, result.getPageable(), result.getTotalElements())),
                stats(productId));
    }

    @Transactional
    public Submitted submit(Long userId, Integer productId, Integer rating, String comment, List<MultipartFile> rawImages) {
        ensureProduct(productId);
        List<MultipartFile> images = ImageRules.nonEmpty(rawImages);
        Validator v = new Validator();
        v.check(rating != null && rating >= 1 && rating <= 5, "rating", "Vui lòng chọn số sao từ 1 đến 5");
        v.check(comment == null || comment.length() <= 2000, "comment", "Nhận xét không được vượt quá 2000 ký tự");
        v.check(images.size() <= MAX_IMAGES, "images", "Chỉ được đính kèm tối đa " + MAX_IMAGES + " ảnh");
        ImageRules.check(v, images, "images", true, ImageRules.DEFAULT_EXT,
                "File tải lên phải là hình ảnh",
                "Ảnh phải có định dạng jpg, jpeg, png hoặc webp",
                "Dung lượng mỗi ảnh không được vượt quá 5MB");
        v.throwIfFailed();

        ProductReview review = reviewRepository.findFirstByProductIdAndUserId(productId, userId).orElse(null);
        boolean created = review == null;
        Instant now = Instant.now();
        if (created) {
            review = new ProductReview();
            review.setProductId(productId);
            review.setUserId(userId);
            review.setCreatedAt(now);
        }
        review.setOrderItemId(completedOrderItem(userId, productId));
        review.setRating(rating);
        review.setComment(comment == null || comment.isBlank() ? null : comment.trim());
        if (!images.isEmpty()) {
            List<String> urls = new ArrayList<>();
            for (MultipartFile f : images) {
                urls.add(cloudinaryService.uploadImage(f, IMAGE_FOLDER));
            }
            review.setImages(urls);
        }
        review.setUpdatedAt(now);
        reviewRepository.save(review);
        if (review.getOrderItemId() != null) {
            xuService.earnForReview(userId, review.getId(), review.getImages() != null && !review.getImages().isEmpty());
        }
        return new Submitted(item(review, userRepository.findById(userId).orElse(null)), created);
    }

    /** Điểm trung bình (1 chữ số thập phân), tổng số và số đánh giá theo từng mức sao. */
    private ProductReviewPage.Stats stats(Integer productId) {
        Map<Integer, Long> breakdown = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) {
            breakdown.put(star, 0L);
        }
        for (Object[] row : productRepository.ratingBreakdown(productId)) {
            int star = ((Number) row[0]).intValue();
            if (breakdown.containsKey(star)) {
                breakdown.put(star, ((Number) row[1]).longValue());
            }
        }
        long count = breakdown.values().stream().mapToLong(Long::longValue).sum();
        long weighted = breakdown.entrySet().stream().mapToLong(e -> e.getKey() * e.getValue()).sum();
        double average = count == 0 ? 0
                : BigDecimal.valueOf(weighted).divide(BigDecimal.valueOf(count), 1, RoundingMode.HALF_UP).doubleValue();
        return new ProductReviewPage.Stats(average, count, breakdown);
    }

    /** Sản phẩm khách đã mua trong một phần đơn đã hoàn tất (để gắn nhãn "Đã mua hàng"). */
    private Long completedOrderItem(Long userId, Integer productId) {
        List<Long> ids = jdbc.queryForList("""
                SELECT oi.id FROM order_items oi
                JOIN seller_orders so ON so.id = oi.seller_order_id AND so.status = 'completed'
                JOIN orders o ON o.id = so.order_id
                WHERE oi.product_id = :p AND o.user_id = :u
                ORDER BY oi.id DESC LIMIT 1
                """, new MapSqlParameterSource().addValue("p", productId).addValue("u", userId), Long.class);
        return ids.isEmpty() ? null : ids.get(0);
    }

    private ProductReviewPage.Item item(ProductReview r, User u) {
        UserSummary s = UserSummary.of(u, props);
        ProductReviewPage.Reviewer reviewer = s == null ? null
                : new ProductReviewPage.Reviewer(s.id(), s.name(), s.username(), s.avatarUrl());
        return new ProductReviewPage.Item(r.getId(), r.getProductId(), r.getRating(), r.getComment(), r.getImages(),
                r.getOrderItemId() != null, r.getCreatedAt(), reviewer);
    }

    private void ensureProduct(Integer productId) {
        if (productId == null || !productRepository.existsById(productId)) {
            throw ApiException.notFound("Không tìm thấy sản phẩm");
        }
    }
}
