package com.shoptech.modules.coupon.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.modules.coupon.dto.MyVoucher;
import com.shoptech.modules.coupon.entity.Coupon;
import com.shoptech.modules.coupon.repository.CouponRepository;
import com.shoptech.modules.customer.service.CustomerTiers;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Ví voucher của khách: voucher theo hạng (phải bấm "Nhận"), voucher khách mới, voucher theo thứ trong tuần,
 * voucher thu cũ đổi mới của riêng khách và voucher công khai do gian hàng phát. Hai loại cuối và ba loại
 * không cần nhận tự hiện ở bước thanh toán.
 */
@Service
@RequiredArgsConstructor
public class CustomerVoucherService {

    private final CouponRepository couponRepository;
    private final CouponApplyService couponApplyService;
    private final NamedParameterJdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public List<MyVoucher> mine(Long userId) {
        int userRank = rank(tierOf(userId));
        boolean newCustomer = couponApplyService.isNewCustomer(userId);
        int today = CouponApplyService.todayWeekday();
        Instant now = Instant.now();

        List<Coupon> coupons = couponRepository.findAll().stream()
                .filter(Coupon::isActive)
                .filter(c -> c.getExpiresAt() == null || c.getExpiresAt().isAfter(now))
                .filter(c -> c.getUserId() == null || c.getUserId().equals(userId))
                .filter(c -> {
                    if (c.getTradeInRequestId() != null) {
                        return c.getUsageLimit() == null || nz(c.getUsedCount()) < c.getUsageLimit();
                    }
                    if (c.isNewCustomerOnly()) {
                        return newCustomer;
                    }
                    if (c.getWeekday() != null) {
                        return c.getWeekday() == today;
                    }
                    if (c.getTargetTier() != null) {
                        return rank(c.getTargetTier()) <= userRank;
                    }
                    return c.getUsageLimit() == null || nz(c.getUsedCount()) < c.getUsageLimit();
                })
                .toList();
        if (coupons.isEmpty()) {
            return List.of();
        }

        List<Long> ids = coupons.stream().map(Coupon::getId).toList();
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("userId", userId).addValue("ids", ids);
        Set<Long> claimed = new HashSet<>(jdbc.queryForList(
                "SELECT coupon_id FROM coupon_claims WHERE user_id = :userId AND coupon_id IN (:ids)", params, Long.class));
        Map<Long, Integer> used = new HashMap<>();
        jdbc.query("SELECT coupon_id, COUNT(*) AS c FROM coupon_redemptions WHERE user_id = :userId AND coupon_id IN (:ids)"
                + " GROUP BY coupon_id", params, rs -> {
            used.put(rs.getLong("coupon_id"), rs.getInt("c"));
        });
        Set<Long> usedToday = new HashSet<>(jdbc.queryForList(
                "SELECT coupon_id FROM coupon_redemptions WHERE user_id = :userId AND coupon_id IN (:ids) AND created_at >= :since",
                params.addValue("since", Timestamp.from(CouponApplyService.startOfTodayVn())), Long.class));
        Map<Long, String> storeNames = new HashMap<>();
        List<Long> storeIds = coupons.stream().map(Coupon::getStoreId).filter(s -> s != null).distinct().toList();
        if (!storeIds.isEmpty()) {
            jdbc.query("SELECT id, name FROM stores WHERE id IN (:ids)", new MapSqlParameterSource("ids", storeIds),
                    rs -> {
                        storeNames.put(rs.getLong("id"), rs.getString("name"));
                    });
        }

        return coupons.stream().map(c -> {
            String kind = c.getTradeInRequestId() != null ? "trade_in"
                    : c.isNewCustomerOnly() ? "new_customer"
                    : c.getWeekday() != null ? "daily"
                    : c.getTargetTier() != null ? "tier" : "public";
            int usedByMe = used.getOrDefault(c.getId(), 0);
            Integer remaining = c.getPerUserLimit() == null ? null : Math.max(0, c.getPerUserLimit() - usedByMe);
            if ("daily".equals(kind) && usedToday.contains(c.getId())) {
                remaining = 0;
            }
            boolean soldOut = "daily".equals(kind) && couponApplyService.isSoldOutToday(c);
            return new MyVoucher(kind, "tier".equals(kind), soldOut, c.getId(), c.getCode(), c.getTitle(),
                    c.getDescription(), c.getType(), c.isFreeShip(), c.getValue(), c.getMaxDiscount(),
                    c.getMinOrderAmount(), c.getTargetTier(), c.getStoreId(), storeNames.get(c.getStoreId()),
                    c.getTargetTier() == null ? null : label(c.getTargetTier()), c.getPerUserLimit(), usedByMe,
                    remaining, c.getExpiresAt(), !"tier".equals(kind) || claimed.contains(c.getId()));
        }).toList();
    }

    /** Nhận voucher (idempotent); trả về true nếu vừa nhận lần đầu. */
    @Transactional
    public boolean claim(Long userId, Long couponId) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy voucher"));
        if (!coupon.isActive() || coupon.getTargetTier() == null) {
            throw ApiException.unprocessable("Voucher này không thể nhận trực tiếp.");
        }
        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.unprocessable("Voucher đã hết hạn.");
        }
        if (rank(tierOf(userId)) < rank(coupon.getTargetTier())) {
            throw ApiException.unprocessable("Voucher này chỉ dành cho khách hàng hạng "
                    + label(coupon.getTargetTier()) + " trở lên.");
        }

        Timestamp now = Timestamp.from(Instant.now());
        int inserted = jdbc.update("""
                INSERT IGNORE INTO coupon_claims (coupon_id, user_id, claimed_at, created_at, updated_at)
                VALUES (:couponId, :userId, :now, :now, :now)
                """, new MapSqlParameterSource()
                .addValue("couponId", couponId).addValue("userId", userId).addValue("now", now));
        return inserted > 0;
    }

    private String tierOf(Long userId) {
        BigDecimal spent = jdbc.queryForObject(
                "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = :userId AND status = :status",
                new MapSqlParameterSource().addValue("userId", userId).addValue("status", CustomerTiers.COUNTED_STATUS),
                BigDecimal.class);
        return CustomerTiers.resolve(spent == null ? BigDecimal.ZERO : spent).key();
    }

    private static int rank(String tierKey) {
        for (int i = 0; i < CustomerTiers.TIERS.size(); i++) {
            if (CustomerTiers.TIERS.get(i).key().equals(tierKey)) {
                return i;
            }
        }
        return 0;
    }

    private static String label(String tierKey) {
        return CustomerTiers.TIERS.stream().filter(t -> t.key().equals(tierKey)).findFirst()
                .orElse(CustomerTiers.TIERS.get(0)).label();
    }

    private static int nz(Integer v) {
        return v == null ? 0 : v;
    }
}
