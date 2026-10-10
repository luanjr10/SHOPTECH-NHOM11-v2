package com.shoptech.modules.xu.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.service.SellerOrderAmounts;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ShopTech Xu: 1 xu = 1đ khi thanh toán. Xu là chi phí marketing của sàn nên mức dùng bị giới hạn bởi
 * tỉ lệ đơn hàng và phần hoa hồng sàn còn lại sau voucher. Số dư cache ở users.xu_balance, mỗi biến động
 * ghi vào xu_transactions (unique theo user + loại + tham chiếu nên không bao giờ cộng đôi).
 */
@Service
@RequiredArgsConstructor
public class XuService {

    public static final int EARN_PERCENT_OF_ORDER = 1;
    public static final int CHECKIN_BASE = 100;
    public static final int CHECKIN_STREAK_BONUS = 500;
    public static final int CHECKIN_STREAK_CYCLE = 7;
    public static final int REVIEW_WITH_PHOTO = 200;
    public static final int REVIEW_TEXT_ONLY = 50;
    public static final int MAX_REDEEM_PERCENT = 50;

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private final NamedParameterJdbcTemplate jdbc;
    private final SellerOrderAmounts amounts;

    public record Transaction(Long id, String type, int amount, int balanceAfter, String referenceType, Long referenceId,
                              String description, Instant createdAt) {
    }

    public record CheckInResult(int xu, int streak, boolean bonus, Map<String, Object> summary) {
    }

    // ------------------------------------------------------------------ cộng / trừ theo sự kiện

    /** Thưởng 1% giá trị hàng khách thực trả khi phần đơn hoàn tất. */
    @Transactional
    public void earnForSellerOrder(SellerOrder so, Long buyerId) {
        int amount = amounts.netProductAmount(so).multiply(BigDecimal.valueOf(EARN_PERCENT_OF_ORDER)).movePointLeft(2)
                .setScale(0, RoundingMode.FLOOR).intValue();
        if (amount > 0) {
            credit(buyerId, "earn_order", amount, "seller_order", so.getId(), "Thưởng xu đơn hàng #" + so.getOrderId());
        }
    }

    /** Thu hồi xu thưởng khi phần đơn được duyệt hoàn trả (chỉ thu phần còn trong ví). */
    @Transactional
    public void reverseEarnForSellerOrder(Long sellerOrderId) {
        List<Map<String, Object>> earned = jdbc.queryForList("""
                SELECT user_id, amount FROM xu_transactions
                WHERE type = 'earn_order' AND reference_type = 'seller_order' AND reference_id = :id LIMIT 1
                """, new MapSqlParameterSource("id", sellerOrderId));
        if (earned.isEmpty()) {
            return;
        }
        long userId = ((Number) earned.get(0).get("user_id")).longValue();
        int earnedAmount = ((Number) earned.get(0).get("amount")).intValue();
        int balance = lockBalance(userId);
        if (balance < 0 || exists(userId, "reverse_earn", "seller_order", sellerOrderId)) {
            return;
        }
        int amount = Math.min(earnedAmount, balance);
        if (amount > 0) {
            write(userId, balance, "reverse_earn", -amount, "seller_order", sellerOrderId, "Thu hồi xu do đơn hoàn trả");
        }
    }

    /** Thưởng đánh giá đã mua hàng: có ảnh 200 xu, chỉ chữ 50 xu. */
    @Transactional
    public void earnForReview(Long userId, Long reviewId, boolean hasPhoto) {
        credit(userId, "earn_review", hasPhoto ? REVIEW_WITH_PHOTO : REVIEW_TEXT_ONLY, "review", reviewId,
                hasPhoto ? "Thưởng đánh giá có ảnh" : "Thưởng đánh giá sản phẩm");
    }

    @Transactional
    public void spendOnOrder(Long userId, Long orderId, int amount) {
        int balance = lockBalance(userId);
        if (balance < 0 || amount > balance) {
            throw ApiException.unprocessable("Số dư xu không đủ.");
        }
        write(userId, balance, "spend_order", -amount, "order", orderId, "Dùng xu thanh toán đơn #" + orderId);
    }

    /** Hoàn xu đã dùng khi đơn bị huỷ. */
    @Transactional
    public void refundOrder(Order order) {
        int used = order.getXuUsed() == null ? 0 : order.getXuUsed();
        if (used > 0) {
            credit(order.getUserId(), "refund_order", used, "order", order.getId(), "Hoàn xu đơn #" + order.getId() + " bị hủy");
        }
    }

    // ------------------------------------------------------------------ điểm danh / tóm tắt

    @Transactional
    public CheckInResult checkIn(Long userId) {
        lockBalance(userId);
        LocalDate today = LocalDate.now(VN);
        if (count("SELECT COUNT(*) FROM daily_checkins WHERE user_id = :u AND checkin_date = :d", userId, today) > 0) {
            throw ApiException.unprocessable("Hôm nay bạn đã điểm danh rồi, mai quay lại nhé!");
        }
        List<Integer> yesterday = jdbc.queryForList(
                "SELECT streak FROM daily_checkins WHERE user_id = :u AND checkin_date = :d",
                new MapSqlParameterSource().addValue("u", userId).addValue("d", Date.valueOf(today.minusDays(1))), Integer.class);
        int streak = (yesterday.isEmpty() ? 0 : yesterday.get(0)) + 1;
        boolean bonus = streak % CHECKIN_STREAK_CYCLE == 0;
        int xu = CHECKIN_BASE + (bonus ? CHECKIN_STREAK_BONUS : 0);

        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO daily_checkins (user_id, checkin_date, streak, xu_earned, created_at, updated_at)
                VALUES (:u, :d, :s, :x, :now, :now)
                """, new MapSqlParameterSource().addValue("u", userId).addValue("d", Date.valueOf(today))
                .addValue("s", streak).addValue("x", xu).addValue("now", now));
        credit(userId, "earn_checkin", xu, "checkin", Long.parseLong(today.toString().replace("-", "")),
                bonus ? "Điểm danh ngày thứ " + streak + " — thưởng chuỗi" : "Điểm danh hằng ngày");
        return new CheckInResult(xu, streak, bonus, summary(userId));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> summary(Long userId) {
        LocalDate today = LocalDate.now(VN);
        List<Map<String, Object>> latest = jdbc.queryForList("""
                SELECT checkin_date, streak FROM daily_checkins WHERE user_id = :u ORDER BY checkin_date DESC LIMIT 1
                """, new MapSqlParameterSource("u", userId));
        boolean checkedToday = false;
        int streak = 0;
        if (!latest.isEmpty()) {
            LocalDate last = ((Date) latest.get(0).get("checkin_date")).toLocalDate();
            checkedToday = last.equals(today);
            if (checkedToday || last.equals(today.minusDays(1))) {
                streak = ((Number) latest.get(0).get("streak")).intValue();
            }
        }
        int nextStreak = streak + 1;
        int nextReward = CHECKIN_BASE + (nextStreak % CHECKIN_STREAK_CYCLE == 0 ? CHECKIN_STREAK_BONUS : 0);

        Map<String, Object> rules = new LinkedHashMap<>();
        rules.put("earn_percent_of_order", EARN_PERCENT_OF_ORDER);
        rules.put("checkin_base", CHECKIN_BASE);
        rules.put("checkin_streak_bonus", CHECKIN_STREAK_BONUS);
        rules.put("checkin_streak_cycle", CHECKIN_STREAK_CYCLE);
        rules.put("review_with_photo", REVIEW_WITH_PHOTO);
        rules.put("review_text_only", REVIEW_TEXT_ONLY);
        rules.put("max_redeem_percent", MAX_REDEEM_PERCENT);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("balance", balance(userId));
        summary.put("checked_in_today", checkedToday);
        summary.put("streak", streak);
        summary.put("next_reward", nextReward);
        summary.put("rules", rules);
        return summary;
    }

    @Transactional(readOnly = true)
    public Page<Transaction> transactions(Long userId, int page, int perPage) {
        long total = count("SELECT COUNT(*) FROM xu_transactions WHERE user_id = :u", userId, null);
        List<Transaction> rows = jdbc.query("""
                SELECT id, type, amount, balance_after, reference_type, reference_id, description, created_at
                FROM xu_transactions WHERE user_id = :u ORDER BY id DESC LIMIT :limit OFFSET :offset
                """, new MapSqlParameterSource().addValue("u", userId).addValue("limit", perPage)
                .addValue("offset", (long) (page - 1) * perPage), (rs, i) -> new Transaction(rs.getLong("id"),
                rs.getString("type"), rs.getInt("amount"), rs.getInt("balance_after"), rs.getString("reference_type"),
                rs.getObject("reference_id") == null ? null : rs.getLong("reference_id"), rs.getString("description"),
                rs.getTimestamp("created_at") == null ? null : rs.getTimestamp("created_at").toInstant()));
        return new PageImpl<>(rows, PageRequest.of(page - 1, perPage), total);
    }

    /**
     * Số xu tối đa được dùng cho đơn: không quá số dư, 50% giá trị hàng sau voucher,
     * và không vượt phần hoa hồng sàn còn lại sau voucher.
     */
    @Transactional(readOnly = true)
    public int maxRedeemable(Long userId, BigDecimal productsAfterVoucher, BigDecimal commissionHeadroom) {
        int byPercent = productsAfterVoucher.max(BigDecimal.ZERO).multiply(BigDecimal.valueOf(MAX_REDEEM_PERCENT))
                .movePointLeft(2).setScale(0, RoundingMode.FLOOR).intValue();
        int byCommission = commissionHeadroom.max(BigDecimal.ZERO).setScale(0, RoundingMode.FLOOR).intValue();
        return Math.max(0, Math.min(balance(userId), Math.min(byPercent, byCommission)));
    }

    public int balance(Long userId) {
        List<Integer> rows = jdbc.queryForList("SELECT xu_balance FROM users WHERE id = :u",
                new MapSqlParameterSource("u", userId), Integer.class);
        return rows.isEmpty() || rows.get(0) == null ? 0 : rows.get(0);
    }

    // ------------------------------------------------------------------ ghi sổ

    /** Cộng xu một lần cho mỗi (loại, tham chiếu) — gọi lại không cộng thêm. */
    private void credit(Long userId, String type, int amount, String refType, long refId, String description) {
        int balance = lockBalance(userId);
        if (balance < 0 || exists(userId, type, refType, refId)) {
            return;
        }
        write(userId, balance, type, amount, refType, refId, description);
    }

    /** Khoá dòng người dùng và trả số dư xu; -1 nếu không có người dùng. */
    private int lockBalance(Long userId) {
        List<Integer> rows = jdbc.queryForList("SELECT xu_balance FROM users WHERE id = :u FOR UPDATE",
                new MapSqlParameterSource("u", userId), Integer.class);
        return rows.isEmpty() ? -1 : (rows.get(0) == null ? 0 : rows.get(0));
    }

    private boolean exists(Long userId, String type, String refType, long refId) {
        Long n = jdbc.queryForObject("""
                SELECT COUNT(*) FROM xu_transactions
                WHERE user_id = :u AND type = :t AND reference_type = :rt AND reference_id = :ri
                """, new MapSqlParameterSource().addValue("u", userId).addValue("t", type)
                .addValue("rt", refType).addValue("ri", refId), Long.class);
        return n != null && n > 0;
    }

    private void write(Long userId, int balance, String type, int amount, String refType, long refId, String description) {
        int next = Math.max(0, balance + amount);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("UPDATE users SET xu_balance = :b, updated_at = :now WHERE id = :u",
                new MapSqlParameterSource().addValue("b", next).addValue("u", userId).addValue("now", now));
        jdbc.update("""
                INSERT INTO xu_transactions (user_id, type, amount, balance_after, reference_type, reference_id,
                                             description, created_at, updated_at)
                VALUES (:u, :t, :a, :ba, :rt, :ri, :d, :now, :now)
                """, new MapSqlParameterSource().addValue("u", userId).addValue("t", type).addValue("a", amount)
                .addValue("ba", next).addValue("rt", refType).addValue("ri", refId).addValue("d", description)
                .addValue("now", now));
    }

    private long count(String sql, Long userId, LocalDate date) {
        MapSqlParameterSource params = new MapSqlParameterSource("u", userId);
        if (date != null) {
            params.addValue("d", Date.valueOf(date));
        }
        Long n = jdbc.queryForObject(sql, params, Long.class);
        return n == null ? 0 : n;
    }
}
