package com.shoptech.modules.customer.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.customer.dto.CustomerDetail;
import com.shoptech.modules.customer.dto.CustomerRow;
import com.shoptech.modules.customer.repository.AddressRepository;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.service.OrderViewService;
import com.shoptech.modules.user.dto.UserResponse;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerService {

    private static final int PER_PAGE = 15;

    /** Khách hàng + tổng chi tiêu/số đơn hoàn tất tính bằng subquery để lọc & sắp xếp theo hạng. */
    private static final String BASE_SQL = """
            SELECT u.id, u.name, u.username, u.email, u.phone, u.avatar, u.google_avatar, u.created_at,
                   (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o
                     WHERE o.user_id = u.id AND o.status = :counted) AS total_spent,
                   (SELECT COUNT(*) FROM orders o
                     WHERE o.user_id = u.id AND o.status = :counted) AS orders_count
            FROM users u
            WHERE u.role = 'customer'
              AND (:search IS NULL OR u.name LIKE :like OR u.username LIKE :like
                   OR u.email LIKE :like OR u.phone LIKE :like)
            HAVING total_spent >= :minSpent AND (:maxSpent IS NULL OR total_spent < :maxSpent)
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final OrderRepository orderRepository;
    private final OrderViewService orderViewService;
    private final AppProperties props;

    public PagedResult<CustomerRow> list(String search, String tier, Integer page, Integer perPage) {
        String term = search == null || search.isBlank() ? null : search.trim();
        BigDecimal[] range = tier == null || tier.isBlank() ? null : CustomerTiers.range(tier);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("counted", CustomerTiers.COUNTED_STATUS)
                .addValue("search", term)
                .addValue("like", term == null ? null : "%" + term + "%")
                .addValue("minSpent", range == null ? BigDecimal.ZERO : range[0])
                .addValue("maxSpent", range == null ? null : range[1]);

        Pageable pageable = Pagination.of(page, perPage, PER_PAGE, Sort.unsorted());
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM (" + BASE_SQL + ") t", params, Long.class);

        params.addValue("limit", pageable.getPageSize()).addValue("offset", pageable.getOffset());
        List<CustomerRow> rows = jdbc.query(BASE_SQL + " ORDER BY total_spent DESC, u.id DESC LIMIT :limit OFFSET :offset",
                params, (rs, i) -> {
                    BigDecimal spent = rs.getBigDecimal("total_spent");
                    var t = CustomerTiers.resolve(spent);
                    String avatar = rs.getString("avatar");
                    String avatarUrl = avatar != null ? props.publicStorageUrl(avatar) : rs.getString("google_avatar");
                    return new CustomerRow(rs.getLong("id"), rs.getString("name"), rs.getString("username"),
                            rs.getString("email"), rs.getString("phone"), avatarUrl,
                            rs.getTimestamp("created_at") == null ? null : rs.getTimestamp("created_at").toInstant(),
                            spent, rs.getLong("orders_count"), t.key(), t.label());
                });
        return PagedResult.of(new PageImpl<>(rows, pageable, total == null ? 0 : total));
    }

    public CustomerDetail detail(Long id) {
        User customer = userRepository.findById(id)
                .filter(u -> User.ROLE_CUSTOMER.equals(u.getRole()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy khách hàng"));

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("userId", id).addValue("counted", CustomerTiers.COUNTED_STATUS);
        BigDecimal totalSpent = jdbc.queryForObject(
                "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = :userId AND status = :counted",
                params, BigDecimal.class);
        Long ordersCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE user_id = :userId AND status = :counted", params, Long.class);

        var tier = CustomerTiers.resolve(totalSpent);
        return new CustomerDetail(
                new CustomerDetail.Customer(UserResponse.of(customer, props), addressRepository.findByUserId(id)),
                tier.key(),
                tier.label(),
                totalSpent,
                ordersCount == null ? 0 : ordersCount,
                CustomerTiers.next(totalSpent),
                orderViewService.build(orderRepository.findTop30ByUserIdOrderByCreatedAtDesc(id), false, false));
    }
}
