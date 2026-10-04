package com.shoptech.modules.store.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.response.PageMeta;
import com.shoptech.modules.review.dto.StoreReviewPage;
import com.shoptech.modules.review.entity.StoreFollow;
import com.shoptech.modules.review.repository.StoreFollowRepository;
import com.shoptech.modules.review.service.ReviewService;
import com.shoptech.modules.seller.repository.SellerProfileRepository;
import com.shoptech.modules.store.dto.PublicStoreDetail;
import com.shoptech.modules.store.dto.PublicStoreItem;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Gian hàng công khai trên trang client: danh sách, chi tiết (chỉ số uy tín) và theo dõi. */
@Service
@RequiredArgsConstructor
public class PublicStoreService {

    private static final int PER_PAGE = 12;
    private static final int MAX_PER_PAGE = 48;
    private static final String ACTIVE = "active";

    /** Cột sắp xếp cố định theo tham số sort (không ghép input người dùng vào SQL). */
    private static final Map<String, String> SORTS = Map.of(
            "products_desc", "products_count DESC, s.id DESC",
            "followers_desc", "followers_count DESC, s.id DESC",
            "name_asc", "s.name ASC, s.id ASC");
    private static final String DEFAULT_SORT = "s.created_at DESC, s.id DESC";

    private final NamedParameterJdbcTemplate jdbc;
    private final StoreRepository storeRepository;
    private final SellerProfileRepository profileRepository;
    private final StoreFollowRepository followRepository;
    private final ReviewService reviewService;

    public record Listing(List<PublicStoreItem> stores, PageMeta meta) {
    }

    @Transactional(readOnly = true)
    public Listing list(String search, Long provinceId, String sort, Integer page, Integer perPage) {
        int size = perPage == null || perPage <= 0 ? PER_PAGE : Math.min(perPage, MAX_PER_PAGE);
        int current = page == null || page < 1 ? 1 : page;
        String keyword = search == null || search.isBlank() ? null : search.trim();
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("search", keyword)
                .addValue("like", keyword == null ? null : "%" + keyword + "%")
                .addValue("provinceId", provinceId)
                .addValue("limit", size)
                .addValue("offset", (current - 1) * size);
        String where = "WHERE s.status = 'active' AND (:search IS NULL OR s.name LIKE :like)"
                + " AND (:provinceId IS NULL OR s.province_id = :provinceId)";

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM stores s " + where, params, Long.class);
        List<PublicStoreItem> stores = jdbc.query("""
                SELECT s.id, s.name, s.slug, s.logo, s.description, s.created_at,
                       (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id) AS products_count,
                       (SELECT COUNT(*) FROM store_follows f WHERE f.store_id = s.id) AS followers_count,
                       (SELECT COUNT(*) FROM product_reviews r JOIN products p ON p.id = r.product_id
                         WHERE p.store_id = s.id) AS reviews_count,
                       (SELECT AVG(r.rating) FROM product_reviews r JOIN products p ON p.id = r.product_id
                         WHERE p.store_id = s.id) AS rating
                FROM stores s
                """ + where + " ORDER BY " + SORTS.getOrDefault(sort == null ? "" : sort, DEFAULT_SORT)
                + " LIMIT :limit OFFSET :offset", params, (rs, i) -> {
            BigDecimal avg = rs.getBigDecimal("rating");
            Timestamp created = rs.getTimestamp("created_at");
            return new PublicStoreItem(rs.getLong("id"), rs.getString("name"), rs.getString("slug"),
                    rs.getString("logo"), rs.getString("description"), rs.getLong("products_count"),
                    rs.getLong("followers_count"), rs.getLong("reviews_count"),
                    avg == null ? 0 : avg.setScale(1, RoundingMode.HALF_UP).doubleValue(),
                    created == null ? null : created.toInstant());
        });

        long count = total == null ? 0 : total;
        return new Listing(stores, new PageMeta(current, (int) Math.max(1, (count + size - 1) / size), size, count));
    }

    @Transactional(readOnly = true)
    public PublicStoreDetail detail(String slug, Long viewerId) {
        Store store = activeBySlug(slug);
        Long storeId = store.getId();
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("storeId", storeId)
                .addValue("since", Timestamp.from(Instant.now().minus(Duration.ofDays(30))));

        long completed = count("SELECT COUNT(*) FROM seller_orders WHERE store_id = :storeId AND status = 'completed'", params);
        long total = count("SELECT COUNT(*) FROM seller_orders WHERE store_id = :storeId", params);
        long orders30d = count("SELECT COUNT(*) FROM seller_orders WHERE store_id = :storeId AND created_at >= :since", params);
        long productsCount = count("SELECT COUNT(*) FROM products WHERE store_id = :storeId", params);
        String level = completed >= 100 ? "Pro Seller" : completed >= 20 ? "Trusted Seller" : "New Seller";

        List<PublicStoreDetail.CategoryRef> categories = jdbc.query("""
                SELECT c.id, c.name, c.slug FROM categories c
                WHERE c.id IN (SELECT DISTINCT p.category_id FROM products p WHERE p.store_id = :storeId)
                ORDER BY c.name
                """, params, (rs, i) -> new PublicStoreDetail.CategoryRef(rs.getInt("id"), rs.getString("name"),
                rs.getString("slug")));

        var profile = store.getSellerProfileId() == null ? null
                : profileRepository.findById(store.getSellerProfileId()).orElse(null);
        StoreReviewPage.Stats rating = reviewService.storeStats(storeId);

        return new PublicStoreDetail(
                store,
                productsCount,
                profile == null ? null
                        : new PublicStoreDetail.SellerRef(profile.getId(), profile.getDisplayName(), profile.getCreatedAt()),
                profile != null && profile.getCreatedAt() != null ? profile.getCreatedAt() : store.getCreatedAt(),
                categories,
                viewerId != null && followRepository.existsByUserIdAndStoreId(viewerId, storeId),
                new PublicStoreDetail.Stats(completed, total, orders30d,
                        total > 0 ? (int) Math.round(completed * 100.0 / total) : null,
                        0, rating.average(), rating.count(), followRepository.countByStoreId(storeId),
                        productsCount, level));
    }

    /** Bấm lần nữa để bỏ theo dõi. */
    @Transactional
    public Map<String, Object> toggleFollow(String slug, Long userId) {
        Store store = activeBySlug(slug);
        boolean following;
        var existing = followRepository.findFirstByUserIdAndStoreId(userId, store.getId());
        if (existing.isPresent()) {
            followRepository.delete(existing.get());
            following = false;
        } else {
            StoreFollow follow = new StoreFollow();
            follow.setUserId(userId);
            follow.setStoreId(store.getId());
            follow.setCreatedAt(Instant.now());
            follow.setUpdatedAt(follow.getCreatedAt());
            followRepository.save(follow);
            following = true;
        }
        followRepository.flush();
        return Map.of("following", following, "followers_count", followRepository.countByStoreId(store.getId()));
    }

    private Store activeBySlug(String slug) {
        return storeRepository.findFirstBySlugAndStatus(slug, ACTIVE)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy gian hàng"));
    }

    private long count(String sql, MapSqlParameterSource params) {
        Long n = jdbc.queryForObject(sql, params, Long.class);
        return n == null ? 0 : n;
    }
}
