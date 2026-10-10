package com.shoptech.modules.tradein.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.util.Json;
import com.shoptech.modules.coupon.entity.Coupon;
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
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Thu cũ đổi mới do từng gian hàng thực hiện: gian hàng tự đặt bảng giá thu theo đời máy, hệ số theo tình trạng.
 * Khi gian hàng duyệt, khách nhận một voucher riêng (chỉ tài khoản đó dùng được, chỉ áp dụng cho sản phẩm
 * của gian hàng đó) và khoản trừ do gian hàng chịu, vì chính gian hàng là bên mua lại máy cũ.
 */
@Service
@RequiredArgsConstructor
public class TradeInService {

    public record Condition(String key, String label, double multiplier, String hint) {
    }

    public static final List<Condition> CONDITIONS = List.of(
            new Condition("like_new", "Như mới", 1.0, "Không trầy xước, pin tốt, đủ chức năng"),
            new Condition("good", "Tốt", 0.85, "Trầy xước nhẹ, hoạt động bình thường"),
            new Condition("fair", "Khá", 0.65, "Trầy xước rõ, pin yếu hoặc có lỗi nhỏ"),
            new Condition("poor", "Cũ", 0.4, "Cấn móp, vỡ viền hoặc lỗi chức năng"));

    public static final Map<String, String> CATEGORIES = categories();

    public static final int BOX_BONUS_PERCENT = 2;
    public static final int CHARGER_BONUS_PERCENT = 1;
    public static final int CREDIT_VALID_DAYS = 30;
    public static final int MAX_OPEN_REQUESTS = 3;
    /** Gian hàng được duyệt cao hơn giá ước tính tối đa 50% (phòng nhập nhầm số). */
    public static final double MAX_FINAL_OVER_ESTIMATE = 1.5;

    private static final String CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private final NamedParameterJdbcTemplate jdbc;
    private final Json json;
    private final SecureRandom random = new SecureRandom();

    private static Map<String, String> categories() {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("phone", "Điện thoại");
        m.put("laptop", "Laptop");
        m.put("tablet", "Máy tính bảng");
        m.put("watch", "Đồng hồ thông minh");
        m.put("other", "Khác");
        return m;
    }

    // ------------------------------------------------------------------ định giá

    /** Báo giá thu mua ước tính, làm tròn đến nghìn đồng. */
    @Transactional(readOnly = true)
    public Map<String, Object> estimate(Long modelId, String conditionKey, boolean hasBox, boolean hasCharger) {
        Map<String, Object> model = jdbc.queryForList("""
                        SELECT m.name, m.base_price FROM trade_in_models m JOIN stores s ON s.id = m.store_id
                        WHERE m.id = :id AND m.is_active = 1 AND s.status = 'active'
                        """, new MapSqlParameterSource("id", modelId)).stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Dòng máy này hiện chưa được thu mua."));
        return estimate((String) model.get("name"), (BigDecimal) model.get("base_price"), conditionKey, hasBox, hasCharger);
    }

    private Map<String, Object> estimate(String modelName, BigDecimal base, String conditionKey, boolean hasBox, boolean hasCharger) {
        Condition condition = CONDITIONS.stream().filter(c -> c.key().equals(conditionKey)).findFirst()
                .orElseThrow(() -> ApiException.unprocessable("Tình trạng máy không hợp lệ."));
        BigDecimal boxBonus = hasBox ? base.multiply(BigDecimal.valueOf(BOX_BONUS_PERCENT)).movePointLeft(2).setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal chargerBonus = hasCharger ? base.multiply(BigDecimal.valueOf(CHARGER_BONUS_PERCENT)).movePointLeft(2).setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal estimated = base.multiply(BigDecimal.valueOf(condition.multiplier())).add(boxBonus).add(chargerBonus)
                .divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(1000));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("model", modelName);
        out.put("base_price", base);
        out.put("condition", condition.key());
        out.put("condition_label", condition.label());
        out.put("multiplier", condition.multiplier());
        out.put("box_bonus", boxBonus);
        out.put("charger_bonus", chargerBonus);
        out.put("estimated_price", estimated);
        return out;
    }

    // ------------------------------------------------------------------ khách

    @Transactional(readOnly = true)
    public Map<String, Object> catalog() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("categories", CATEGORIES);
        out.put("conditions", CONDITIONS.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", c.key());
            m.put("label", c.label());
            m.put("hint", c.hint());
            return m;
        }).toList());
        out.put("stores", jdbc.queryForList("""
                SELECT id, name, slug, logo FROM stores WHERE status = 'active'
                  AND id IN (SELECT store_id FROM trade_in_models WHERE is_active = 1) ORDER BY id
                """, new MapSqlParameterSource()));
        out.put("models", jdbc.queryForList("""
                SELECT m.id, m.store_id, m.category, m.brand, m.name FROM trade_in_models m
                JOIN stores s ON s.id = m.store_id AND s.status = 'active'
                WHERE m.is_active = 1 ORDER BY m.category, m.brand, m.base_price DESC
                """, new MapSqlParameterSource()));
        out.put("credit_valid_days", CREDIT_VALID_DAYS);
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> mine(Long userId) {
        return jdbc.query("""
                SELECT r.*, s.name AS store_name, s.slug AS store_slug FROM trade_in_requests r
                LEFT JOIN stores s ON s.id = r.store_id WHERE r.user_id = :u ORDER BY r.created_at DESC, r.id DESC
                """, new MapSqlParameterSource("u", userId), (rs, i) -> requestRow(rs, false));
    }

    public record SubmitData(Long storeId, Long modelId, String condition, boolean hasBox, boolean hasCharger, String description) {
    }

    @Transactional
    public Map<String, Object> submit(Long userId, SubmitData data, List<String> imageUrls) {
        Map<String, Object> store = jdbc.queryForList("SELECT id FROM stores WHERE id = :id AND status = 'active'",
                new MapSqlParameterSource("id", data.storeId())).stream().findFirst()
                .orElseThrow(() -> ApiException.unprocessable("Gian hàng này hiện không nhận thu cũ."));
        Map<String, Object> model = jdbc.queryForList("""
                SELECT id, name, base_price FROM trade_in_models WHERE id = :id AND store_id = :s AND is_active = 1
                """, new MapSqlParameterSource().addValue("id", data.modelId()).addValue("s", store.get("id"))).stream().findFirst()
                .orElseThrow(() -> ApiException.unprocessable("Gian hàng này hiện chưa thu mua dòng máy đã chọn."));

        Long open = jdbc.queryForObject("SELECT COUNT(*) FROM trade_in_requests WHERE user_id = :u AND store_id = :s AND status = 'pending'",
                new MapSqlParameterSource().addValue("u", userId).addValue("s", data.storeId()), Long.class);
        if (open != null && open >= MAX_OPEN_REQUESTS) {
            throw ApiException.unprocessable("Bạn đang có " + MAX_OPEN_REQUESTS
                    + " yêu cầu chờ duyệt tại gian hàng này, vui lòng đợi xử lý xong.");
        }

        Map<String, Object> estimate = estimate((String) model.get("name"), (BigDecimal) model.get("base_price"),
                data.condition(), data.hasBox(), data.hasCharger());
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO trade_in_requests (user_id, store_id, trade_in_model_id, model_name, `condition`, has_box, has_charger,
                    description, images, estimated_price, status, created_at, updated_at)
                VALUES (:u, :s, :m, :name, :cond, :box, :charger, :desc, :images, :est, 'pending', :now, :now)
                """, new MapSqlParameterSource().addValue("u", userId).addValue("s", data.storeId())
                .addValue("m", data.modelId()).addValue("name", model.get("name")).addValue("cond", data.condition())
                .addValue("box", data.hasBox()).addValue("charger", data.hasCharger())
                .addValue("desc", data.description()).addValue("images", json.write(imageUrls))
                .addValue("est", estimate.get("estimated_price")).addValue("now", now));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("store_id", data.storeId());
        out.put("model_name", model.get("name"));
        out.put("condition", data.condition());
        out.put("estimated_price", estimate.get("estimated_price"));
        out.put("status", "pending");
        return out;
    }

    // ------------------------------------------------------------------ gian hàng: bảng giá + duyệt

    @Transactional(readOnly = true)
    public List<Map<String, Object>> models(Long storeId) {
        return jdbc.query("SELECT * FROM trade_in_models WHERE store_id = :s ORDER BY category, brand, name",
                new MapSqlParameterSource("s", storeId), (rs, i) -> modelRow(rs));
    }

    @Transactional
    public Map<String, Object> saveModel(Long storeId, Long modelId, String category, String brand, String name,
                                         BigDecimal basePrice, boolean active) {
        Timestamp now = Timestamp.from(Instant.now());
        MapSqlParameterSource p = new MapSqlParameterSource().addValue("s", storeId).addValue("c", category)
                .addValue("b", brand.trim()).addValue("n", name.trim()).addValue("p", basePrice).addValue("a", active)
                .addValue("now", now);
        if (modelId == null) {
            jdbc.update("""
                    INSERT INTO trade_in_models (store_id, category, brand, name, base_price, is_active, created_at, updated_at)
                    VALUES (:s, :c, :b, :n, :p, :a, :now, :now)
                    """, p);
            modelId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", new MapSqlParameterSource(), Long.class);
        } else {
            requireModelOfStore(storeId, modelId);
            jdbc.update("""
                    UPDATE trade_in_models SET category = :c, brand = :b, name = :n, base_price = :p, is_active = :a,
                           updated_at = :now WHERE id = :id
                    """, p.addValue("id", modelId));
        }
        return jdbc.query("SELECT * FROM trade_in_models WHERE id = :id", new MapSqlParameterSource("id", modelId),
                (rs, i) -> modelRow(rs)).get(0);
    }

    @Transactional
    public void deleteModel(Long storeId, Long modelId) {
        requireModelOfStore(storeId, modelId);
        jdbc.update("DELETE FROM trade_in_models WHERE id = :id", new MapSqlParameterSource("id", modelId));
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> requests(Long storeId, String status, int page, int perPage) {
        MapSqlParameterSource p = new MapSqlParameterSource("s", storeId);
        String where = " WHERE r.store_id = :s";
        if (status != null && !status.isBlank()) {
            where += " AND r.status = :st";
            p.addValue("st", status);
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM trade_in_requests r" + where, p, Long.class);
        p.addValue("limit", perPage).addValue("offset", (long) (page - 1) * perPage);
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT r.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
                FROM trade_in_requests r LEFT JOIN users u ON u.id = r.user_id
                """ + where + " ORDER BY r.created_at DESC, r.id DESC LIMIT :limit OFFSET :offset", p, (rs, i) -> requestRow(rs, true));
        return new PageImpl<>(rows, PageRequest.of(page - 1, perPage), total == null ? 0 : total);
    }

    /** Duyệt: tạo voucher riêng cho khách (khoản trừ do gian hàng chịu), hạn 30 ngày. */
    @Transactional
    public Map<String, Object> approve(Long storeId, Long requestId, Long reviewerId, BigDecimal finalPrice, String note) {
        Map<String, Object> req = lockedRequest(storeId, requestId);
        BigDecimal estimated = (BigDecimal) req.get("estimated_price");
        BigDecimal fin = finalPrice == null ? estimated : finalPrice;
        if (fin.signum() <= 0 || fin.compareTo(estimated.multiply(BigDecimal.valueOf(MAX_FINAL_OVER_ESTIMATE))) > 0) {
            throw ApiException.unprocessable("Giá thu cuối không hợp lệ (phải > 0 và không vượt quá 150% giá ước tính).");
        }
        String storeName = jdbc.queryForList("SELECT name FROM stores WHERE id = :id", new MapSqlParameterSource("id", storeId), String.class)
                .stream().findFirst().orElse("gian hàng");
        String code = "THUCU" + requestId + randomSuffix(4);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO coupons (code, title, description, type, is_free_ship, value, min_order_amount, usage_limit,
                    per_user_limit, used_count, expires_at, is_active, user_id, trade_in_request_id, store_id,
                    new_customer_only, created_at, updated_at)
                VALUES (:code, :title, :desc, 'fixed', 0, :v, :v, 1, 1, 0, :exp, 1, :u, :rid, :store, 0, :now, :now)
                """, new MapSqlParameterSource().addValue("code", code)
                .addValue("title", "Thu cũ đổi mới — " + req.get("model_name"))
                .addValue("desc", "Trừ " + money(fin) + "đ khi mua sản phẩm của " + storeName + " (đơn từ cùng giá trị), hạn "
                        + CREDIT_VALID_DAYS + " ngày.")
                .addValue("v", fin).addValue("exp", Timestamp.from(Instant.now().plus(CREDIT_VALID_DAYS, ChronoUnit.DAYS)))
                .addValue("u", req.get("user_id")).addValue("rid", requestId).addValue("store", storeId).addValue("now", now));
        jdbc.update("""
                UPDATE trade_in_requests SET status = 'approved', final_price = :f, admin_note = :n, reviewed_by = :r,
                       reviewed_at = :now, coupon_code = :code, updated_at = :now WHERE id = :id
                """, new MapSqlParameterSource().addValue("f", fin).addValue("n", note).addValue("r", reviewerId)
                .addValue("now", now).addValue("code", code).addValue("id", requestId));
        return detail(requestId);
    }

    @Transactional
    public Map<String, Object> reject(Long storeId, Long requestId, Long reviewerId, String note) {
        lockedRequest(storeId, requestId);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                UPDATE trade_in_requests SET status = 'rejected', admin_note = :n, reviewed_by = :r, reviewed_at = :now,
                       updated_at = :now WHERE id = :id
                """, new MapSqlParameterSource().addValue("n", note).addValue("r", reviewerId).addValue("now", now)
                .addValue("id", requestId));
        return detail(requestId);
    }

    // ------------------------------------------------------------------ gắn với đơn hàng

    /** Đơn dùng voucher thu cũ: đánh dấu yêu cầu đã dùng. */
    @Transactional
    public void markUsedByOrder(Coupon coupon, Long orderId) {
        if (coupon.getTradeInRequestId() == null) {
            return;
        }
        jdbc.update("UPDATE trade_in_requests SET status = 'used', used_order_id = :o WHERE id = :id",
                new MapSqlParameterSource().addValue("o", orderId).addValue("id", coupon.getTradeInRequestId()));
    }

    /** Đơn dùng voucher thu cũ bị huỷ: trả lại voucher để khách dùng cho đơn khác (nếu chưa hết hạn). */
    @Transactional
    public void releaseForOrder(Long orderId, String discountCode) {
        if (discountCode == null) {
            return;
        }
        List<Map<String, Object>> coupons = jdbc.queryForList(
                "SELECT id, trade_in_request_id FROM coupons WHERE code = :c AND trade_in_request_id IS NOT NULL",
                new MapSqlParameterSource("c", discountCode));
        if (coupons.isEmpty()) {
            return;
        }
        Object couponId = coupons.get(0).get("id");
        jdbc.update("DELETE FROM coupon_redemptions WHERE coupon_id = :c AND order_id = :o",
                new MapSqlParameterSource().addValue("c", couponId).addValue("o", orderId));
        jdbc.update("UPDATE coupons SET used_count = GREATEST(0, used_count - 1) WHERE id = :c", new MapSqlParameterSource("c", couponId));
        jdbc.update("UPDATE trade_in_requests SET status = 'approved', used_order_id = NULL WHERE id = :id AND status = 'used'",
                new MapSqlParameterSource("id", coupons.get(0).get("trade_in_request_id")));
    }

    // ------------------------------------------------------------------ helpers

    private Map<String, Object> lockedRequest(Long storeId, Long requestId) {
        Map<String, Object> req = jdbc.queryForList("SELECT * FROM trade_in_requests WHERE id = :id AND store_id = :s FOR UPDATE",
                        new MapSqlParameterSource().addValue("id", requestId).addValue("s", storeId)).stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy yêu cầu"));
        if (!"pending".equals(req.get("status"))) {
            throw ApiException.unprocessable("Yêu cầu này đã được xử lý rồi.");
        }
        return req;
    }

    private void requireModelOfStore(Long storeId, Long modelId) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM trade_in_models WHERE id = :id AND store_id = :s",
                new MapSqlParameterSource().addValue("id", modelId).addValue("s", storeId), Long.class);
        if (n == null || n == 0) {
            throw ApiException.notFound("Không tìm thấy dòng máy");
        }
    }

    private Map<String, Object> detail(Long requestId) {
        return jdbc.query("""
                SELECT r.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
                FROM trade_in_requests r LEFT JOIN users u ON u.id = r.user_id WHERE r.id = :id
                """, new MapSqlParameterSource("id", requestId), (rs, i) -> requestRow(rs, true)).get(0);
    }

    private Map<String, Object> requestRow(ResultSet rs, boolean withUser) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", rs.getLong("id"));
        row.put("user_id", rs.getLong("user_id"));
        row.put("store_id", rs.getObject("store_id"));
        row.put("trade_in_model_id", rs.getObject("trade_in_model_id"));
        row.put("model_name", rs.getString("model_name"));
        row.put("condition", rs.getString("condition"));
        row.put("has_box", rs.getBoolean("has_box"));
        row.put("has_charger", rs.getBoolean("has_charger"));
        row.put("description", rs.getString("description"));
        row.put("images", json.stringList(rs.getString("images")));
        row.put("estimated_price", rs.getBigDecimal("estimated_price"));
        row.put("final_price", rs.getBigDecimal("final_price"));
        row.put("status", rs.getString("status"));
        row.put("admin_note", rs.getString("admin_note"));
        row.put("coupon_code", rs.getString("coupon_code"));
        row.put("used_order_id", rs.getObject("used_order_id"));
        row.put("reviewed_at", iso(rs.getTimestamp("reviewed_at")));
        row.put("created_at", iso(rs.getTimestamp("created_at")));
        if (withUser) {
            Map<String, Object> user = new LinkedHashMap<>();
            user.put("id", rs.getLong("user_id"));
            user.put("name", rs.getString("user_name"));
            user.put("email", rs.getString("user_email"));
            user.put("phone", rs.getString("user_phone"));
            row.put("user", user);
        } else {
            Map<String, Object> store = new LinkedHashMap<>();
            store.put("id", rs.getObject("store_id"));
            store.put("name", rs.getString("store_name"));
            store.put("slug", rs.getString("store_slug"));
            row.put("store", rs.getObject("store_id") == null ? null : store);
        }
        return row;
    }

    private static Map<String, Object> modelRow(ResultSet rs) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", rs.getLong("id"));
        row.put("store_id", rs.getObject("store_id"));
        row.put("category", rs.getString("category"));
        row.put("brand", rs.getString("brand"));
        row.put("name", rs.getString("name"));
        row.put("base_price", rs.getBigDecimal("base_price"));
        row.put("is_active", rs.getBoolean("is_active"));
        return row;
    }

    private String randomSuffix(int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }

    private static String iso(Timestamp ts) {
        return ts == null ? null : ts.toInstant().toString();
    }

    private static String money(BigDecimal v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", symbols).format(v);
    }
}
