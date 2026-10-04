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
 * Voucher dành cho hạng thành viên: khách thấy các voucher đang hoạt động có hạng yêu cầu ≤ hạng của mình,
 * bấm "Nhận" để lưu vào ví voucher (coupon_claims) rồi dùng khi thanh toán.
 */
@Service
@RequiredArgsConstructor
public class CustomerVoucherService {

    private final CouponRepository couponRepository;
    private final NamedParameterJdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public List<MyVoucher> mine(Long userId) {
        int userRank = rank(tierOf(userId));
        Instant now = Instant.now();
        List<Coupon> coupons = couponRepository.findAll().stream()
                .filter(c -> c.getTargetTier() != null && c.isActive())
                .filter(c -> c.getExpiresAt() == null || c.getExpiresAt().isAfter(now))
                .filter(c -> rank(c.getTargetTier()) <= userRank)
                .toList();
        if (coupons.isEmpty()) {
            return List.of();
        }

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("ids", coupons.stream().map(Coupon::getId).toList());
        Set<Long> claimed = new HashSet<>(jdbc.queryForList(
                "SELECT coupon_id FROM coupon_claims WHERE user_id = :userId AND coupon_id IN (:ids)", params, Long.class));
        Map<Long, Integer> used = new HashMap<>();
        jdbc.query("SELECT coupon_id, COUNT(*) AS c FROM coupon_redemptions WHERE user_id = :userId AND coupon_id IN (:ids)"
                + " GROUP BY coupon_id", params, rs -> {
            used.put(rs.getLong("coupon_id"), rs.getInt("c"));
        });

        return coupons.stream().map(c -> {
            int usedByMe = used.getOrDefault(c.getId(), 0);
            return new MyVoucher(c.getId(), c.getCode(), c.getTitle(), c.getDescription(), c.getType(), c.isFreeShip(),
                    c.getValue(), c.getMaxDiscount(), c.getMinOrderAmount(), c.getTargetTier(), label(c.getTargetTier()),
                    c.getPerUserLimit(), usedByMe,
                    c.getPerUserLimit() == null ? null : Math.max(0, c.getPerUserLimit() - usedByMe),
                    c.getExpiresAt(), claimed.contains(c.getId()));
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
}
