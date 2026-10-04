package com.shoptech.modules.coupon.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.modules.coupon.entity.Coupon;
import com.shoptech.modules.coupon.repository.CouponRepository;
import com.shoptech.modules.customer.service.CustomerTiers;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.util.Locale;

/**
 * Kiểm tra và tính tiền giảm của mã giảm giá. Voucher miễn phí ship giảm vào phí vận chuyển,
 * còn lại giảm vào tiền hàng (theo % có trần hoặc số tiền cố định).
 */
@Service
@RequiredArgsConstructor
public class CouponApplyService {

    private final CouponRepository couponRepository;
    private final NamedParameterJdbcTemplate jdbc;

    public record Result(Coupon coupon, BigDecimal discountAmount, String discountTarget) {
    }

    @Transactional(readOnly = true)
    public Result apply(String code, BigDecimal subtotal, Long userId, BigDecimal shippingFee) {
        Coupon coupon = couponRepository.findFirstByCodeIgnoreCase(code == null ? "" : code.trim())
                .filter(Coupon::isActive)
                .orElseThrow(() -> ApiException.unprocessable("Mã giảm giá không tồn tại hoặc đã bị khóa."));

        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.unprocessable("Mã giảm giá đã hết hạn.");
        }
        if (coupon.getUsageLimit() != null && nz(coupon.getUsedCount()) >= coupon.getUsageLimit()) {
            throw ApiException.unprocessable("Mã giảm giá đã hết lượt sử dụng.");
        }
        BigDecimal minOrder = coupon.getMinOrderAmount() == null ? BigDecimal.ZERO : coupon.getMinOrderAmount();
        if (subtotal.compareTo(minOrder) < 0) {
            throw ApiException.unprocessable("Đơn hàng cần tối thiểu " + money(minOrder) + "đ để dùng mã này.");
        }

        if (coupon.getTargetTier() != null) {
            if (userId == null) {
                throw ApiException.unprocessable("Bạn cần đăng nhập để dùng voucher này.");
            }
            if (rank(tierOf(userId)) < rank(coupon.getTargetTier())) {
                throw ApiException.unprocessable("Voucher này chỉ dành cho khách hàng hạng "
                        + label(coupon.getTargetTier()) + " trở lên.");
            }
            if (count("SELECT COUNT(*) FROM coupon_claims WHERE coupon_id = :c AND user_id = :u", coupon.getId(), userId) == 0) {
                throw ApiException.unprocessable("Vui lòng bấm \"Nhận voucher\" trước khi áp dụng.");
            }
        }
        if (coupon.getPerUserLimit() != null) {
            if (userId == null) {
                throw ApiException.unprocessable("Bạn cần đăng nhập để dùng voucher này.");
            }
            if (count("SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = :c AND user_id = :u", coupon.getId(), userId)
                    >= coupon.getPerUserLimit()) {
                throw ApiException.unprocessable("Bạn đã dùng hết lượt cho voucher này.");
            }
        }

        if (coupon.isFreeShip()) {
            BigDecimal cap = coupon.getMaxDiscount() == null ? shippingFee : coupon.getMaxDiscount();
            return new Result(coupon, shippingFee.min(cap).setScale(2, RoundingMode.HALF_UP), "shipping");
        }

        BigDecimal value = coupon.getValue() == null ? BigDecimal.ZERO : coupon.getValue();
        BigDecimal discount = "percent".equals(coupon.getType())
                ? subtotal.multiply(value).movePointLeft(2)
                : value;
        if ("percent".equals(coupon.getType()) && coupon.getMaxDiscount() != null) {
            discount = discount.min(coupon.getMaxDiscount());
        }
        return new Result(coupon, discount.setScale(2, RoundingMode.HALF_UP).min(subtotal), "subtotal");
    }

    /** Ghi nhận đã dùng mã cho đơn (gọi trong transaction đặt hàng). */
    @Transactional
    public void redeem(Coupon coupon, Long userId, Long orderId) {
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("UPDATE coupons SET used_count = used_count + 1 WHERE id = :c",
                new MapSqlParameterSource("c", coupon.getId()));
        jdbc.update("""
                INSERT INTO coupon_redemptions (coupon_id, user_id, order_id, created_at, updated_at)
                VALUES (:c, :u, :o, :now, :now)
                """, new MapSqlParameterSource().addValue("c", coupon.getId()).addValue("u", userId)
                .addValue("o", orderId).addValue("now", now));
    }

    private long count(String sql, Long couponId, Long userId) {
        Long n = jdbc.queryForObject(sql, new MapSqlParameterSource().addValue("c", couponId).addValue("u", userId), Long.class);
        return n == null ? 0 : n;
    }

    private String tierOf(Long userId) {
        BigDecimal spent = jdbc.queryForObject(
                "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = :u AND status = :s",
                new MapSqlParameterSource().addValue("u", userId).addValue("s", CustomerTiers.COUNTED_STATUS),
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

    private static String money(BigDecimal v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", symbols).format(v);
    }
}
