package com.shoptech.modules.customer.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.response.PagedResult;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.customer.dto.SellerCustomerDetail;
import com.shoptech.modules.customer.dto.SellerCustomerRow;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Khách hàng của một gian hàng (Seller Center) = người đã có phần đơn tại gian hàng.
 * Chi tiêu tại gian hàng chỉ tính phần đơn hoàn tất; hạng khách tính theo tổng chi tiêu toàn sàn (CustomerTiers).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SellerCustomerService {

    private static final int PER_PAGE = 15;

    private static final String BASE = """
            FROM seller_orders so
            JOIN orders o ON o.id = so.order_id
            JOIN users u ON u.id = o.user_id
            WHERE so.store_id = :storeId
              AND (:search IS NULL OR u.name LIKE :like OR u.username LIKE :like
                   OR u.email LIKE :like OR u.phone LIKE :like)
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final AppProperties props;

    public PagedResult<SellerCustomerRow> list(Store store, String search, Integer page, Integer perPage) {
        int size = perPage == null || perPage <= 0 ? PER_PAGE : Math.min(perPage, 100);
        int current = page == null || page < 1 ? 1 : page;
        String keyword = search == null || search.isBlank() ? null : search.trim();
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("storeId", store.getId())
                .addValue("search", keyword)
                .addValue("like", keyword == null ? null : "%" + keyword + "%")
                .addValue("limit", size)
                .addValue("offset", (current - 1) * size);

        Long total = jdbc.queryForObject("SELECT COUNT(DISTINCT u.id) " + BASE, params, Long.class);

        List<SellerCustomerRow> rows = jdbc.query("""
                SELECT u.id, u.name, u.username, u.email, u.phone,
                       SUM(CASE WHEN so.status = 'completed' THEN so.subtotal ELSE 0 END) AS store_spent,
                       COUNT(DISTINCT o.id) AS store_orders_count,
                       MAX(o.created_at) AS last_order_at
                """ + BASE + """
                GROUP BY u.id, u.name, u.username, u.email, u.phone
                ORDER BY store_spent DESC, u.id
                LIMIT :limit OFFSET :offset
                """, params, (rs, i) -> new SellerCustomerRow(rs.getLong("id"), rs.getString("name"),
                rs.getString("username"), rs.getString("email"), rs.getString("phone"),
                rs.getDouble("store_spent"), rs.getLong("store_orders_count"),
                instant(rs.getTimestamp("last_order_at")), 0, null, null));

        Map<Long, Double> spent = totalSpent(rows.stream().map(SellerCustomerRow::id).toList());
        List<SellerCustomerRow> data = rows.stream().map(r -> {
            double totalSpent = spent.getOrDefault(r.id(), 0d);
            CustomerTiers.Tier tier = CustomerTiers.resolve(BigDecimal.valueOf(totalSpent));
            return new SellerCustomerRow(r.id(), r.name(), r.username(), r.email(), r.phone(), r.storeSpent(),
                    r.storeOrdersCount(), r.lastOrderAt(), totalSpent, tier.key(), tier.label());
        }).toList();

        long count = total == null ? 0 : total;
        int lastPage = (int) Math.max(1, (count + size - 1) / size);
        long from = (long) (current - 1) * size + 1;
        return new PagedResult<>(current, data, data.isEmpty() ? null : from, lastPage, size,
                data.isEmpty() ? null : from + data.size() - 1, count);
    }

    public SellerCustomerDetail detail(Store store, Long customerId) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("storeId", store.getId())
                .addValue("userId", customerId);

        List<SellerCustomerDetail.StoreOrder> orders = jdbc.query("""
                SELECT so.id, so.order_id, so.status, so.subtotal, o.created_at
                FROM seller_orders so
                JOIN orders o ON o.id = so.order_id
                WHERE so.store_id = :storeId AND o.user_id = :userId
                ORDER BY so.id DESC
                LIMIT 30
                """, params, (rs, i) -> new SellerCustomerDetail.StoreOrder(rs.getLong("id"), rs.getLong("order_id"),
                rs.getString("status"), rs.getDouble("subtotal"), instant(rs.getTimestamp("created_at"))));
        if (orders.isEmpty()) {
            throw ApiException.notFound("Khách hàng chưa từng mua tại gian hàng này");
        }
        User user = userRepository.findById(customerId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy khách hàng"));

        Double storeSpent = jdbc.queryForObject("""
                SELECT COALESCE(SUM(so.subtotal), 0)
                FROM seller_orders so
                JOIN orders o ON o.id = so.order_id
                WHERE so.store_id = :storeId AND o.user_id = :userId AND so.status = 'completed'
                """, params, Double.class);
        double totalSpent = totalSpent(List.of(customerId)).getOrDefault(customerId, 0d);
        CustomerTiers.Tier tier = CustomerTiers.resolve(BigDecimal.valueOf(totalSpent));

        String avatarUrl = user.getAvatar() != null ? props.publicStorageUrl(user.getAvatar())
                : (user.getGoogleAvatar() == null || user.getGoogleAvatar().isBlank() ? null : user.getGoogleAvatar());
        return new SellerCustomerDetail(
                new SellerCustomerDetail.Customer(user.getId(), user.getName(), user.getUsername(), user.getEmail(),
                        user.getPhone(), avatarUrl, user.getCreatedAt()),
                tier.key(), tier.label(), totalSpent, storeSpent == null ? 0 : storeSpent, orders);
    }

    /** Tổng chi tiêu toàn sàn (đơn đã hoàn tất) của nhiều khách cùng lúc. */
    private Map<Long, Double> totalSpent(List<Long> userIds) {
        Map<Long, Double> out = new HashMap<>();
        if (userIds.isEmpty()) {
            return out;
        }
        jdbc.query("""
                SELECT user_id, COALESCE(SUM(total_amount), 0) AS total_spent
                FROM orders
                WHERE user_id IN (:ids) AND status = :status
                GROUP BY user_id
                """, new MapSqlParameterSource().addValue("ids", userIds).addValue("status", CustomerTiers.COUNTED_STATUS),
                rs -> {
                    out.put(rs.getLong("user_id"), rs.getDouble("total_spent"));
                });
        return out;
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
