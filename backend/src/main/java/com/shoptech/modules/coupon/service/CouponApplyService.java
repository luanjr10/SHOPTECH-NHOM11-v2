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
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Locale;
import java.util.Map;

/**
 * Kiểm tra và tính tiền giảm của mã giảm giá. Voucher miễn phí ship giảm vào phí vận chuyển, còn lại giảm vào
 * tiền hàng (theo % có trần hoặc số tiền cố định). Voucher do gian hàng phát chỉ tính trên phần hàng / phí ship
 * của gian hàng đó và do gian hàng chịu; voucher còn lại bị cắt trần bằng hoa hồng sàn thu được từ đơn.
 */
@Service
@RequiredArgsConstructor
public class CouponApplyService {

    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private final CouponRepository couponRepository;
    private final NamedParameterJdbcTemplate jdbc;

    /** Kết quả áp mã: số tiền giảm sau khi cắt trần, số gốc trước khi cắt và cờ đã bị cắt trần. */
    public record Result(Coupon coupon, BigDecimal discountAmount, String discountTarget, boolean capped,
                         BigDecimal originalDiscount) {
    }

    /**
     * @param storeSubtotals    tạm tính từng gian hàng (store_id → tiền hàng)
     * @param storeShippingFees phí ship từng gian hàng
     * @param commissionCap     tổng hoa hồng sàn của đơn; null = không cắt trần
     */
    @Transactional(readOnly = true)
    public Result apply(String code, BigDecimal subtotal, Long userId, BigDecimal shippingFee, BigDecimal commissionCap,
                        String receiverPhone, Map<Long, BigDecimal> storeSubtotals, Map<Long, BigDecimal> storeShippingFees) {
        Result raw = resolve(code, subtotal, userId, shippingFee, receiverPhone, storeSubtotals, storeShippingFees);
        boolean ignoresCap = raw.coupon().getTradeInRequestId() != null || raw.coupon().getStoreId() != null;
        if (commissionCap != null && !ignoresCap && raw.discountAmount().compareTo(commissionCap) > 0) {
            return new Result(raw.coupon(), commissionCap.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP),
                    raw.discountTarget(), true, raw.discountAmount());
        }
        return raw;
    }

    private Result resolve(String code, BigDecimal subtotal, Long userId, BigDecimal shippingFee, String receiverPhone,
                           Map<Long, BigDecimal> storeSubtotals, Map<Long, BigDecimal> storeShippingFees) {
        Coupon coupon = couponRepository.findFirstByCodeIgnoreCase(code == null ? "" : code.trim())
                .filter(Coupon::isActive)
                .orElseThrow(() -> ApiException.unprocessable("Mã giảm giá không tồn tại hoặc đã bị khóa."));

        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.unprocessable("Mã giảm giá đã hết hạn.");
        }
        if (coupon.getUsageLimit() != null && nz(coupon.getUsedCount()) >= coupon.getUsageLimit()) {
            throw ApiException.unprocessable("Mã giảm giá đã hết lượt sử dụng.");
        }
        if (coupon.getUserId() != null && !coupon.getUserId().equals(userId)) {
            throw ApiException.unprocessable("Mã giảm giá này không dành cho tài khoản của bạn.");
        }

        if (coupon.getStoreId() != null) {
            BigDecimal eligible = storeSubtotals == null ? BigDecimal.ZERO
                    : storeSubtotals.getOrDefault(coupon.getStoreId(), BigDecimal.ZERO);
            if (eligible.signum() <= 0) {
                String storeName = jdbc.queryForList("SELECT name FROM stores WHERE id = :id",
                                new MapSqlParameterSource("id", coupon.getStoreId()), String.class)
                        .stream().findFirst().orElse("đã phát voucher");
                throw ApiException.unprocessable("Voucher này chỉ áp dụng cho sản phẩm của gian hàng " + storeName + ".");
            }
            subtotal = eligible;
        }

        BigDecimal minOrder = coupon.getMinOrderAmount() == null ? BigDecimal.ZERO : coupon.getMinOrderAmount();
        if (subtotal.compareTo(minOrder) < 0) {
            throw ApiException.unprocessable("Đơn hàng cần tối thiểu " + money(minOrder) + "đ để dùng mã này.");
        }

        if (coupon.isNewCustomerOnly()) {
            requireLogin(userId);
            boolean verified = jdbc.queryForList("SELECT email_verified_at FROM users WHERE id = :u",
                    new MapSqlParameterSource("u", userId), Timestamp.class).stream().anyMatch(t -> t != null);
            if (!verified) {
                throw ApiException.unprocessable("Vui lòng xác thực email để dùng voucher dành cho khách hàng mới.");
            }
            if (!isNewCustomer(userId) || (receiverPhone != null && !receiverPhone.isBlank() && phoneHasOrdered(receiverPhone))) {
                throw ApiException.unprocessable("Voucher này chỉ dành cho khách hàng mới, áp dụng cho đơn hàng đầu tiên.");
            }
        }

        if (coupon.getWeekday() != null) {
            if (coupon.getWeekday() != todayWeekday()) {
                throw ApiException.unprocessable("Voucher này chỉ áp dụng vào " + weekdayLabel(coupon.getWeekday()) + " hàng tuần.");
            }
            requireLogin(userId);
            if (isSoldOutToday(coupon)) {
                throw ApiException.unprocessable("Voucher hôm nay đã hết lượt, hẹn bạn tuần sau.");
            }
            if (count("SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = :c AND user_id = :u AND created_at >= :since",
                    coupon.getId(), userId, startOfTodayVn()) > 0) {
                throw ApiException.unprocessable("Bạn đã dùng voucher này hôm nay rồi, hẹn bạn tuần sau.");
            }
        }

        if (coupon.getTargetTier() != null) {
            requireLogin(userId);
            if (rank(tierOf(userId)) < rank(coupon.getTargetTier())) {
                throw ApiException.unprocessable("Voucher này chỉ dành cho khách hàng hạng "
                        + label(coupon.getTargetTier()) + " trở lên.");
            }
            if (count("SELECT COUNT(*) FROM coupon_claims WHERE coupon_id = :c AND user_id = :u", coupon.getId(), userId, null) == 0) {
                throw ApiException.unprocessable("Vui lòng bấm \"Nhận voucher\" trước khi áp dụng.");
            }
        }
        if (coupon.getPerUserLimit() != null) {
            requireLogin(userId);
            if (count("SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = :c AND user_id = :u", coupon.getId(), userId, null)
                    >= coupon.getPerUserLimit()) {
                throw ApiException.unprocessable("Bạn đã dùng hết lượt cho voucher này.");
            }
        }

        if (coupon.isFreeShip()) {
            BigDecimal base = coupon.getStoreId() != null
                    ? (storeShippingFees == null ? BigDecimal.ZERO : storeShippingFees.getOrDefault(coupon.getStoreId(), BigDecimal.ZERO))
                    : shippingFee;
            BigDecimal cap = coupon.getMaxDiscount() == null ? base : coupon.getMaxDiscount();
            BigDecimal discount = base.min(cap).setScale(2, RoundingMode.HALF_UP);
            return new Result(coupon, discount, "shipping", false, discount);
        }

        BigDecimal value = coupon.getValue() == null ? BigDecimal.ZERO : coupon.getValue();
        BigDecimal discount = "percent".equals(coupon.getType()) ? subtotal.multiply(value).movePointLeft(2) : value;
        if ("percent".equals(coupon.getType()) && coupon.getMaxDiscount() != null) {
            discount = discount.min(coupon.getMaxDiscount());
        }
        discount = discount.setScale(2, RoundingMode.HALF_UP).min(subtotal);
        return new Result(coupon, discount, "subtotal", false, discount);
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

    // ------------------------------------------------------------------ luật theo khách / theo ngày

    /** Khách mới = chưa có đơn nào khác "cancelled". */
    public boolean isNewCustomer(Long userId) {
        return count("SELECT COUNT(*) FROM orders WHERE user_id = :u AND status <> 'cancelled'", null, userId, null) == 0;
    }

    public boolean phoneHasOrdered(String phone) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE receiver_phone = :p AND status <> 'cancelled'",
                new MapSqlParameterSource("p", phone), Long.class);
        return n != null && n > 0;
    }

    /** 0 = Chủ nhật … 6 = Thứ 7, theo giờ Việt Nam. */
    public static int todayWeekday() {
        DayOfWeek day = ZonedDateTime.now(VN).getDayOfWeek();
        return day.getValue() % 7;
    }

    public static String weekdayLabel(int weekday) {
        return weekday == 0 ? "Chủ Nhật" : "Thứ " + (weekday + 1);
    }

    public static Instant startOfTodayVn() {
        return ZonedDateTime.now(VN).toLocalDate().atStartOfDay(VN).toInstant();
    }

    /** Mã theo ngày đã hết suất trong hôm nay (daily_limit = tổng lượt/ngày VN). */
    public boolean isSoldOutToday(Coupon coupon) {
        if (coupon.getWeekday() == null || coupon.getDailyLimit() == null) {
            return false;
        }
        return count("SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = :c AND created_at >= :since",
                coupon.getId(), null, startOfTodayVn()) >= coupon.getDailyLimit();
    }

    // ------------------------------------------------------------------ helpers

    private static void requireLogin(Long userId) {
        if (userId == null) {
            throw ApiException.unprocessable("Bạn cần đăng nhập để dùng voucher này.");
        }
    }

    private long count(String sql, Long couponId, Long userId, Instant since) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        if (sql.contains(":c")) {
            params.addValue("c", couponId);
        }
        if (sql.contains(":u")) {
            params.addValue("u", userId);
        }
        if (sql.contains(":since")) {
            params.addValue("since", Timestamp.from(since));
        }
        Long n = jdbc.queryForObject(sql, params, Long.class);
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
