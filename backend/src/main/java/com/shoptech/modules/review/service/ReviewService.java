package com.shoptech.modules.review.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.review.dto.ReviewResponse;
import com.shoptech.modules.review.dto.StoreFollowResponse;
import com.shoptech.modules.review.dto.StoreReviewPage;
import com.shoptech.modules.review.entity.ProductReview;
import com.shoptech.modules.review.entity.StoreFollow;
import com.shoptech.modules.review.repository.ProductReviewRepository;
import com.shoptech.modules.review.repository.StoreFollowRepository;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import com.shoptech.modules.user.dto.UserSummary;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private static final int PER_PAGE = 15;

    private final ProductReviewRepository reviewRepository;
    private final StoreFollowRepository followRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final AppProperties props;

    @Transactional(readOnly = true)
    public PagedResult<ReviewResponse> reviews(Integer rating, Long storeId, Integer page, Integer perPage) {
        Page<ProductReview> result = reviewRepository.search(rating, storeId,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()));
        List<ProductReview> reviews = result.getContent();

        Map<Integer, Product> products = productRepository.findAllById(reviews.stream()
                        .map(ProductReview::getProductId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Product::getId, p -> p));
        Map<Long, Store> stores = stores(products.values().stream().map(Product::getStoreId).toList());
        Map<Long, UserSummary> users = users(reviews.stream().map(ProductReview::getUserId).toList());

        List<ReviewResponse> content = reviews.stream().map(r -> {
            Product p = products.get(r.getProductId());
            ReviewResponse.ProductRef product = null;
            if (p != null) {
                Store s = p.getStoreId() == null ? null : stores.get(p.getStoreId());
                product = new ReviewResponse.ProductRef(p.getId(), p.getName(), p.getStoreId(),
                        s == null ? null : new ReviewResponse.StoreRef(s.getId(), s.getName()));
            }
            return ReviewResponse.of(r, product, users.get(r.getUserId()));
        }).toList();
        return PagedResult.of(new PageImpl<>(content, result.getPageable(), result.getTotalElements()));
    }

    /** Điểm trung bình (làm tròn 1 chữ số) và số đánh giá của mọi sản phẩm thuộc gian hàng. */
    @Transactional(readOnly = true)
    public StoreReviewPage.Stats storeStats(Long storeId) {
        Object[] row = reviewRepository.storeStats(storeId).stream().findFirst().orElse(new Object[]{0L, null});
        long count = row[0] == null ? 0 : ((Number) row[0]).longValue();
        double average = count == 0 || row[1] == null ? 0
                : BigDecimal.valueOf(((Number) row[1]).doubleValue()).setScale(1, RoundingMode.HALF_UP).doubleValue();
        return new StoreReviewPage.Stats(average, count);
    }

    @Transactional
    public void deleteReview(Long id) {
        ProductReview review = reviewRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đánh giá"));
        reviewRepository.delete(review);
    }

    @Transactional(readOnly = true)
    public PagedResult<StoreFollowResponse> follows(String search, Long storeId, Integer page, Integer perPage) {
        Page<StoreFollow> result = followRepository.search(storeId,
                search == null || search.isBlank() ? null : search.trim(),
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()));
        List<StoreFollow> follows = result.getContent();

        Map<Long, UserSummary> users = users(follows.stream().map(StoreFollow::getUserId).toList());
        Map<Long, Store> stores = stores(follows.stream().map(StoreFollow::getStoreId).toList());

        List<StoreFollowResponse> content = follows.stream().map(f -> {
            Store s = stores.get(f.getStoreId());
            return new StoreFollowResponse(f.getId(), f.getUserId(), f.getStoreId(), f.getCreatedAt(), f.getUpdatedAt(),
                    users.get(f.getUserId()),
                    s == null ? null : new StoreFollowResponse.StoreRef(s.getId(), s.getName(), s.getSlug()));
        }).toList();
        return PagedResult.of(new PageImpl<>(content, result.getPageable(), result.getTotalElements()));
    }

    private Map<Long, UserSummary> users(Collection<Long> ids) {
        return userRepository.findAllById(ids.stream().filter(Objects::nonNull).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(User::getId, u -> UserSummary.of(u, props)));
    }

    private Map<Long, Store> stores(Collection<Long> ids) {
        return storeRepository.findByIdIn(ids.stream().filter(Objects::nonNull).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Store::getId, s -> s));
    }
}
