package com.shoptech.modules.affiliate.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.repository.OrderItemRepository;
import com.shoptech.modules.order.service.SellerOrderAmounts;
import com.shoptech.modules.payment.gateway.MomoGateway;
import com.shoptech.modules.payment.gateway.PaymentGatewayException;
import com.shoptech.modules.product.document.ProductImage;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Affiliate theo sản phẩm: gian hàng bật affiliate và đặt % hoa hồng cho từng sản phẩm; khách lấy link
 * (?aff=mã của mình), đơn đặt qua link hoàn thành thì hoa hồng vào ví affiliate của khách tại gian hàng đó.
 * Số dư tính từ affiliate_commissions trừ affiliate_withdrawals; gian hàng tự chi trả (MoMo sandbox).
 */
@Service
@RequiredArgsConstructor
public class AffiliateService {

    public static final BigDecimal DEFAULT_RATE = BigDecimal.valueOf(2);
    public static final int DEFAULT_HOLD_DAYS = 7;
    public static final int DEFAULT_MIN_WITHDRAWAL = 50_000;
    private static final String CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private final NamedParameterJdbcTemplate jdbc;
    private final OrderItemRepository orderItemRepository;
    private final SellerOrderAmounts amounts;
    private final ProductImageRepository imageRepository;
    private final MomoGateway momoGateway;
    private final AppProperties props;
    private final SecureRandom random = new SecureRandom();

    public record Settings(boolean enabled, BigDecimal rate, int holdDays, int minWithdrawal) {
    }

    public record Attribution(Long referrerId, BigDecimal rate) {
    }

    public record Balances(BigDecimal available, BigDecimal pending, BigDecimal withdrawn, BigDecimal withdrawing,
                           BigDecimal totalEarned) {
    }

    // ------------------------------------------------------------------ cấu hình gian hàng

    @Transactional(readOnly = true)
    public Settings settingsFor(Long storeId) {
        List<Settings> rows = jdbc.query("SELECT enabled, rate, hold_days, min_withdrawal FROM store_affiliate_settings WHERE store_id = :s",
                new MapSqlParameterSource("s", storeId), (rs, i) -> new Settings(rs.getBoolean("enabled"),
                        rs.getBigDecimal("rate"), rs.getInt("hold_days"), rs.getInt("min_withdrawal")));
        return rows.isEmpty() ? new Settings(false, DEFAULT_RATE, DEFAULT_HOLD_DAYS, DEFAULT_MIN_WITHDRAWAL) : rows.get(0);
    }

    @Transactional
    public Settings updateSettings(Long storeId, boolean enabled, BigDecimal rate, int holdDays, int minWithdrawal) {
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO store_affiliate_settings (store_id, enabled, rate, hold_days, min_withdrawal, created_at, updated_at)
                VALUES (:s, :e, :r, :h, :m, :now, :now)
                ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), rate = VALUES(rate), hold_days = VALUES(hold_days),
                                        min_withdrawal = VALUES(min_withdrawal), updated_at = VALUES(updated_at)
                """, new MapSqlParameterSource().addValue("s", storeId).addValue("e", enabled).addValue("r", rate)
                .addValue("h", holdDays).addValue("m", minWithdrawal).addValue("now", now));
        return settingsFor(storeId);
    }

    // ------------------------------------------------------------------ mã giới thiệu + ghi nhận

    @Transactional
    public String ensureReferralCode(Long userId) {
        List<String> existing = jdbc.queryForList("SELECT referral_code FROM users WHERE id = :u",
                new MapSqlParameterSource("u", userId), String.class);
        if (!existing.isEmpty() && existing.get(0) != null) {
            return existing.get(0);
        }
        String code;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                sb.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
            }
            code = sb.toString();
        } while (count("SELECT COUNT(*) FROM users WHERE referral_code = :c", new MapSqlParameterSource("c", code)) > 0);
        jdbc.update("UPDATE users SET referral_code = :c WHERE id = :u",
                new MapSqlParameterSource().addValue("c", code).addValue("u", userId));
        return code;
    }

    /**
     * Ghi nhận người giới thiệu cho một dòng hàng khi đặt đơn: chỉ hợp lệ nếu sản phẩm đang bật affiliate,
     * gian hàng đang bật chương trình và người giới thiệu không phải chính người mua.
     */
    @Transactional(readOnly = true)
    public Attribution attribute(Long buyerId, Product product, String code) {
        if (code == null || code.isBlank() || product.getStoreId() == null) {
            return null;
        }
        List<Long> referrers = jdbc.queryForList("SELECT id FROM users WHERE referral_code = :c",
                new MapSqlParameterSource("c", code.trim().toUpperCase(Locale.ROOT)), Long.class);
        if (referrers.isEmpty() || referrers.get(0).equals(buyerId)) {
            return null;
        }
        if (!settingsFor(product.getStoreId()).enabled()) {
            return null;
        }
        List<BigDecimal> rates = jdbc.queryForList("SELECT rate FROM product_affiliates WHERE product_id = :p AND enabled = 1",
                new MapSqlParameterSource("p", product.getId()), BigDecimal.class);
        return rates.isEmpty() ? null : new Attribution(referrers.get(0), rates.get(0));
    }

    /**
     * Hoa hồng phát sinh khi đơn con hoàn thành: mỗi người giới thiệu một khoản, tính theo tỉ lệ đã chốt trên từng
     * dòng hàng và phần giá trị hàng thực trả (đã trừ giảm giá).
     */
    @Transactional
    public void recordForCompletedOrder(SellerOrder so, Long buyerId) {
        List<OrderItem> items = orderItemRepository.findBySellerOrderIdOrderByIdAsc(so.getId()).stream()
                .filter(i -> i.getAffiliateReferrerId() != null).toList();
        if (items.isEmpty()) {
            return;
        }
        BigDecimal subtotal = so.getSubtotal() == null ? BigDecimal.ZERO : so.getSubtotal();
        BigDecimal netProduct = amounts.netProductAmount(so);
        int holdDays = settingsFor(so.getStoreId()).holdDays();
        Timestamp now = Timestamp.from(Instant.now());

        Map<Long, List<OrderItem>> byReferrer = items.stream().collect(Collectors.groupingBy(OrderItem::getAffiliateReferrerId,
                LinkedHashMap::new, Collectors.toList()));
        byReferrer.forEach((referrerId, lines) -> {
            if (referrerId.equals(buyerId)) {
                return;
            }
            BigDecimal base = BigDecimal.ZERO;
            BigDecimal commission = BigDecimal.ZERO;
            for (OrderItem line : lines) {
                BigDecimal net = subtotal.signum() > 0
                        ? line.getLineTotal().multiply(netProduct).divide(subtotal, 6, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                base = base.add(net);
                commission = commission.add(net.multiply(line.getAffiliateRate()).movePointLeft(2));
            }
            base = base.setScale(2, RoundingMode.HALF_UP);
            commission = commission.setScale(2, RoundingMode.HALF_UP);
            if (commission.signum() <= 0) {
                return;
            }
            BigDecimal rate = commission.multiply(BigDecimal.valueOf(100)).divide(base, 2, RoundingMode.HALF_UP);
            jdbc.update("""
                    INSERT IGNORE INTO affiliate_commissions (referrer_id, referred_user_id, store_id, seller_order_id,
                        order_amount, rate, amount, status, available_at, created_at, updated_at)
                    VALUES (:ref, :buyer, :store, :so, :base, :rate, :amount, 'pending', :avail, :now, :now)
                    """, new MapSqlParameterSource().addValue("ref", referrerId).addValue("buyer", buyerId)
                    .addValue("store", so.getStoreId()).addValue("so", so.getId()).addValue("base", base)
                    .addValue("rate", rate).addValue("amount", commission)
                    .addValue("avail", Timestamp.from(Instant.now().plus(holdDays, ChronoUnit.DAYS))).addValue("now", now));
        });
    }

    /** Đơn con được duyệt hoàn trả → huỷ hoa hồng chưa rút. */
    @Transactional
    public void cancelForSellerOrder(Long sellerOrderId) {
        jdbc.update("UPDATE affiliate_commissions SET status = 'cancelled', updated_at = :now WHERE seller_order_id = :so AND status = 'pending'",
                new MapSqlParameterSource().addValue("so", sellerOrderId).addValue("now", Timestamp.from(Instant.now())));
    }

    // ------------------------------------------------------------------ sản phẩm affiliate

    /** Bật/tắt affiliate và đặt tỉ lệ hoa hồng cho nhiều sản phẩm của gian hàng cùng lúc. */
    @Transactional
    public int setProductsAffiliate(Long storeId, List<Integer> productIds, boolean enabled, BigDecimal rate) {
        List<Integer> owned = jdbc.queryForList("SELECT id FROM products WHERE store_id = :s AND id IN (:ids)",
                new MapSqlParameterSource().addValue("s", storeId).addValue("ids", productIds), Integer.class);
        Timestamp now = Timestamp.from(Instant.now());
        BigDecimal fallback = settingsFor(storeId).rate();
        for (Integer productId : owned) {
            jdbc.update("""
                    INSERT INTO product_affiliates (product_id, store_id, rate, enabled, created_at, updated_at)
                    VALUES (:p, :s, :r, :e, :now, :now)
                    ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_at = VALUES(updated_at),
                                            rate = IF(:keep, rate, VALUES(rate))
                    """, new MapSqlParameterSource().addValue("p", productId).addValue("s", storeId)
                    .addValue("r", rate == null ? fallback : rate).addValue("e", enabled)
                    .addValue("keep", rate == null).addValue("now", now));
        }
        return owned.size();
    }

    /** Sản phẩm của gian hàng kèm trạng thái affiliate (trang quản lý của người bán). */
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> sellerProducts(Long storeId, String search, int page, int perPage) {
        MapSqlParameterSource params = new MapSqlParameterSource("s", storeId);
        String where = " WHERE p.store_id = :s";
        if (search != null && !search.isBlank()) {
            where += " AND p.name LIKE :q";
            params.addValue("q", "%" + search.trim() + "%");
        }
        long total = count("SELECT COUNT(*) FROM products p" + where, params);
        params.addValue("limit", perPage).addValue("offset", (long) (page - 1) * perPage);
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT p.id, p.name, p.price, p.discount_percent, pa.enabled, pa.rate
                FROM products p LEFT JOIN product_affiliates pa ON pa.product_id = p.id
                """ + where + " ORDER BY p.id DESC LIMIT :limit OFFSET :offset", params, (rs, i) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", rs.getInt("id"));
            row.put("name", rs.getString("name"));
            row.put("price", rs.getBigDecimal("price"));
            row.put("discount_percent", rs.getInt("discount_percent"));
            row.put("affiliate_enabled", rs.getBoolean("enabled"));
            row.put("affiliate_rate", rs.getBigDecimal("rate"));
            return row;
        });
        Map<Integer, String> thumbnails = thumbnails(rows.stream().map(r -> (Integer) r.get("id")).toList());
        rows.forEach(r -> r.put("thumbnail", thumbnails.get((Integer) r.get("id"))));
        return new PageImpl<>(rows, PageRequest.of(page - 1, perPage), total);
    }

    /** Sản phẩm đang chạy affiliate (công khai), kèm ảnh và tiền hoa hồng ước tính trên mỗi sản phẩm. */
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> catalog(String search, Long storeId, int page, int perPage) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        String from = """
                FROM products p
                JOIN product_affiliates pa ON pa.product_id = p.id AND pa.enabled = 1
                JOIN store_affiliate_settings sas ON sas.store_id = p.store_id AND sas.enabled = 1
                JOIN stores s ON s.id = p.store_id AND s.status = 'active'
                WHERE p.status = 1
                """;
        if (search != null && !search.isBlank()) {
            from += " AND p.name LIKE :q";
            params.addValue("q", "%" + search.trim() + "%");
        }
        if (storeId != null) {
            from += " AND p.store_id = :store";
            params.addValue("store", storeId);
        }
        long total = count("SELECT COUNT(*) " + from, params);
        params.addValue("limit", perPage).addValue("offset", (long) (page - 1) * perPage);
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT p.id, p.name, p.slug, p.price, p.discount_percent, p.store_id, s.name AS store_name, s.slug AS store_slug,
                       pa.rate AS rate
                """ + from + " ORDER BY pa.rate DESC, p.id DESC LIMIT :limit OFFSET :offset", params, (rs, i) -> {
            BigDecimal original = rs.getBigDecimal("price");
            int discount = rs.getInt("discount_percent");
            BigDecimal price = original.subtract(original.multiply(BigDecimal.valueOf(discount)).movePointLeft(2))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal rate = rs.getBigDecimal("rate");
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", rs.getInt("id"));
            row.put("name", rs.getString("name"));
            row.put("slug", rs.getString("slug"));
            row.put("price", price);
            row.put("original_price", original);
            row.put("discount_percent", discount);
            Map<String, Object> store = new LinkedHashMap<>();
            store.put("id", rs.getLong("store_id"));
            store.put("name", rs.getString("store_name"));
            store.put("slug", rs.getString("store_slug"));
            row.put("store", store);
            row.put("rate", rate);
            row.put("commission_estimate", price.multiply(rate).movePointLeft(2).setScale(2, RoundingMode.HALF_UP));
            return row;
        });
        Map<Integer, String> thumbnails = thumbnails(rows.stream().map(r -> (Integer) r.get("id")).toList());
        rows.forEach(r -> r.put("thumbnail", thumbnails.get((Integer) r.get("id"))));
        return new PageImpl<>(rows, PageRequest.of(page - 1, perPage), total);
    }

    private Map<Integer, String> thumbnails(List<Integer> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        Map<Integer, String> out = new HashMap<>();
        for (ProductImage pi : imageRepository.findByProductIdIn(productIds)) {
            if (pi.getImages() != null && !pi.getImages().isEmpty()) {
                out.putIfAbsent(pi.getProductId(), pi.getImages().get(0));
            }
        }
        return out;
    }

    // ------------------------------------------------------------------ ví affiliate của khách

    /** Số dư affiliate của một người tại một gian hàng (mỗi gian hàng tự chi trả phần của mình). */
    @Transactional(readOnly = true)
    public Balances balances(Long userId, Long storeId) {
        Timestamp now = Timestamp.from(Instant.now());
        MapSqlParameterSource p = new MapSqlParameterSource().addValue("u", userId).addValue("s", storeId).addValue("now", now);
        BigDecimal matured = sum("""
                SELECT COALESCE(SUM(amount), 0) FROM affiliate_commissions
                WHERE referrer_id = :u AND store_id = :s AND status = 'pending' AND available_at <= :now
                """, p);
        BigDecimal waiting = sum("""
                SELECT COALESCE(SUM(amount), 0) FROM affiliate_commissions
                WHERE referrer_id = :u AND store_id = :s AND status = 'pending' AND available_at > :now
                """, p);
        BigDecimal withdrawn = sum("SELECT COALESCE(SUM(amount), 0) FROM affiliate_withdrawals WHERE user_id = :u AND store_id = :s AND status = 'approved'", p);
        BigDecimal withdrawing = sum("SELECT COALESCE(SUM(amount), 0) FROM affiliate_withdrawals WHERE user_id = :u AND store_id = :s AND status = 'pending'", p);
        return new Balances(matured.subtract(withdrawn).subtract(withdrawing).setScale(2, RoundingMode.HALF_UP), waiting,
                withdrawn, withdrawing, matured.add(waiting));
    }

    /** Các gian hàng đang chạy affiliate hoặc khách đã có hoa hồng/yêu cầu rút ở đó. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> storesFor(Long userId) {
        List<Map<String, Object>> stores = jdbc.queryForList("""
                SELECT id, name, slug, logo FROM stores WHERE status = 'active' AND (
                    id IN (SELECT store_id FROM store_affiliate_settings WHERE enabled = 1)
                    OR id IN (SELECT store_id FROM affiliate_commissions WHERE referrer_id = :u AND store_id IS NOT NULL)
                    OR id IN (SELECT store_id FROM affiliate_withdrawals WHERE user_id = :u AND store_id IS NOT NULL))
                ORDER BY id
                """, new MapSqlParameterSource("u", userId));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> store : stores) {
            long storeId = ((Number) store.get("id")).longValue();
            Settings s = settingsFor(storeId);
            Balances b = balances(userId, storeId);
            Map<String, Object> settings = new LinkedHashMap<>();
            settings.put("enabled", s.enabled());
            settings.put("rate", s.rate());
            settings.put("hold_days", s.holdDays());
            settings.put("min_withdrawal", s.minWithdrawal());
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("store", store);
            entry.put("settings", settings);
            entry.put("balances", balancesMap(b));
            out.add(entry);
        }
        return out;
    }

    public static Map<String, Object> balancesMap(Balances b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("available", b.available());
        m.put("pending", b.pending());
        m.put("withdrawn", b.withdrawn());
        m.put("withdrawing", b.withdrawing());
        m.put("total_earned", b.totalEarned());
        return m;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> commissionsOf(Long userId, int page, int perPage) {
        MapSqlParameterSource p = new MapSqlParameterSource("u", userId);
        long total = count("SELECT COUNT(*) FROM affiliate_commissions WHERE referrer_id = :u", p);
        p.addValue("limit", perPage).addValue("offset", (long) (page - 1) * perPage);
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT c.*, ru.name AS referred_name, s.name AS store_name
                FROM affiliate_commissions c
                LEFT JOIN users ru ON ru.id = c.referred_user_id
                LEFT JOIN stores s ON s.id = c.store_id
                WHERE c.referrer_id = :u ORDER BY c.created_at DESC, c.id DESC LIMIT :limit OFFSET :offset
                """, p, (rs, i) -> commissionRow(rs, false));
        return new PageImpl<>(rows, PageRequest.of(page - 1, perPage), total);
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> commissionsOfStore(Long storeId, int page, int perPage) {
        MapSqlParameterSource p = new MapSqlParameterSource("s", storeId);
        long total = count("SELECT COUNT(*) FROM affiliate_commissions WHERE store_id = :s", p);
        p.addValue("limit", perPage).addValue("offset", (long) (page - 1) * perPage);
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT c.*, ru.name AS referred_name, rf.name AS referrer_name, rf.email AS referrer_email, s.name AS store_name
                FROM affiliate_commissions c
                LEFT JOIN users ru ON ru.id = c.referred_user_id
                LEFT JOIN users rf ON rf.id = c.referrer_id
                LEFT JOIN stores s ON s.id = c.store_id
                WHERE c.store_id = :s ORDER BY c.created_at DESC, c.id DESC LIMIT :limit OFFSET :offset
                """, p, (rs, i) -> commissionRow(rs, true));
        return new PageImpl<>(rows, PageRequest.of(page - 1, perPage), total);
    }

    private static Map<String, Object> commissionRow(java.sql.ResultSet rs, boolean withReferrer) throws java.sql.SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", rs.getLong("id"));
        row.put("referrer_id", rs.getLong("referrer_id"));
        row.put("store_id", rs.getObject("store_id"));
        row.put("seller_order_id", rs.getLong("seller_order_id"));
        row.put("order_amount", rs.getBigDecimal("order_amount"));
        row.put("rate", rs.getBigDecimal("rate"));
        row.put("amount", rs.getBigDecimal("amount"));
        row.put("status", rs.getString("status"));
        row.put("available_at", iso(rs.getTimestamp("available_at")));
        row.put("created_at", iso(rs.getTimestamp("created_at")));
        row.put("referred_user", ref(rs.getLong("referred_user_id"), rs.getString("referred_name")));
        row.put("store", rs.getObject("store_id") == null ? null : ref(rs.getLong("store_id"), rs.getString("store_name")));
        if (withReferrer) {
            Map<String, Object> referrer = ref(rs.getLong("referrer_id"), rs.getString("referrer_name"));
            referrer.put("email", rs.getString("referrer_email"));
            row.put("referrer", referrer);
        }
        return row;
    }

    // ------------------------------------------------------------------ rút tiền

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> withdrawalsOf(Long userId, int page, int perPage) {
        MapSqlParameterSource p = new MapSqlParameterSource("u", userId);
        long total = count("SELECT COUNT(*) FROM affiliate_withdrawals WHERE user_id = :u", p);
        p.addValue("limit", perPage).addValue("offset", (long) (page - 1) * perPage);
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT w.*, s.name AS store_name FROM affiliate_withdrawals w LEFT JOIN stores s ON s.id = w.store_id
                WHERE w.user_id = :u ORDER BY w.created_at DESC, w.id DESC LIMIT :limit OFFSET :offset
                """, p, (rs, i) -> withdrawalRow(rs, false));
        return new PageImpl<>(rows, PageRequest.of(page - 1, perPage), total);
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> withdrawalsOfStore(Long storeId, String status, int page, int perPage) {
        MapSqlParameterSource p = new MapSqlParameterSource("s", storeId);
        String where = " WHERE w.store_id = :s";
        if (status != null && !status.isBlank()) {
            where += " AND w.status = :st";
            p.addValue("st", status);
        }
        long total = count("SELECT COUNT(*) FROM affiliate_withdrawals w" + where, p);
        p.addValue("limit", perPage).addValue("offset", (long) (page - 1) * perPage);
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT w.*, s.name AS store_name, u.name AS user_name, u.email AS user_email
                FROM affiliate_withdrawals w LEFT JOIN stores s ON s.id = w.store_id LEFT JOIN users u ON u.id = w.user_id
                """ + where + " ORDER BY w.created_at DESC, w.id DESC LIMIT :limit OFFSET :offset", p,
                (rs, i) -> withdrawalRow(rs, true));
        return new PageImpl<>(rows, PageRequest.of(page - 1, perPage), total);
    }

    private static Map<String, Object> withdrawalRow(java.sql.ResultSet rs, boolean withUser) throws java.sql.SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", rs.getLong("id"));
        row.put("user_id", rs.getLong("user_id"));
        row.put("store_id", rs.getObject("store_id"));
        row.put("amount", rs.getBigDecimal("amount"));
        row.put("bank_name", rs.getString("bank_name"));
        row.put("bank_account", rs.getString("bank_account"));
        row.put("account_holder", rs.getString("account_holder"));
        row.put("status", rs.getString("status"));
        row.put("note", rs.getString("note"));
        row.put("payout_reference", rs.getString("payout_reference"));
        row.put("reviewed_at", iso(rs.getTimestamp("reviewed_at")));
        row.put("created_at", iso(rs.getTimestamp("created_at")));
        row.put("store", rs.getObject("store_id") == null ? null : ref(rs.getLong("store_id"), rs.getString("store_name")));
        if (withUser) {
            Map<String, Object> user = ref(rs.getLong("user_id"), rs.getString("user_name"));
            user.put("email", rs.getString("user_email"));
            row.put("user", user);
        }
        return row;
    }

    /** Khách gửi yêu cầu rút hoa hồng tại một gian hàng về ví MoMo (khoá dòng người dùng để không rút trùng). */
    @Transactional
    public Map<String, Object> requestWithdrawal(Long userId, Long storeId, BigDecimal amount, String momoPhone,
                                                 String accountHolder) {
        jdbc.queryForList("SELECT id FROM users WHERE id = :u FOR UPDATE", new MapSqlParameterSource("u", userId), Long.class);
        int min = settingsFor(storeId).minWithdrawal();
        if (amount.compareTo(BigDecimal.valueOf(min)) < 0) {
            throw ApiException.unprocessable("Số tiền rút tối thiểu tại gian hàng này là " + money(min) + "đ");
        }
        if (amount.compareTo(balances(userId, storeId).available()) > 0) {
            throw ApiException.unprocessable("Số tiền rút vượt quá số dư có thể rút tại gian hàng này");
        }
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO affiliate_withdrawals (user_id, store_id, amount, bank_name, bank_account, account_holder,
                                                   status, created_at, updated_at)
                VALUES (:u, :s, :a, 'MoMo', :phone, :holder, 'pending', :now, :now)
                """, new MapSqlParameterSource().addValue("u", userId).addValue("s", storeId).addValue("a", amount)
                .addValue("phone", momoPhone).addValue("holder", accountHolder).addValue("now", now));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user_id", userId);
        out.put("store_id", storeId);
        out.put("amount", amount);
        out.put("bank_name", "MoMo");
        out.put("bank_account", momoPhone);
        out.put("account_holder", accountHolder);
        out.put("status", "pending");
        return out;
    }

    /** Gian hàng từ chối hoặc xác nhận đã tự chuyển tay. */
    @Transactional
    public void reviewWithdrawal(Long storeId, Long withdrawalId, String status, Long reviewerId, String note) {
        Map<String, Object> w = pendingWithdrawal(storeId, withdrawalId);
        jdbc.update("UPDATE affiliate_withdrawals SET status = :st, note = :n, reviewed_by = :r, reviewed_at = :now, updated_at = :now WHERE id = :id",
                new MapSqlParameterSource().addValue("st", status).addValue("n", note).addValue("r", reviewerId)
                        .addValue("now", Timestamp.from(Instant.now())).addValue("id", w.get("id")));
    }

    /** Tạo link thanh toán MoMo sandbox để gian hàng chi trả hoa hồng cho người giới thiệu. */
    @Transactional
    public String createPayoutUrl(Long storeId, Long withdrawalId, Long reviewerId) {
        Map<String, Object> w = pendingWithdrawal(storeId, withdrawalId);
        String ref = momoGateway.partnerCode() + "-AW" + withdrawalId + "-" + Instant.now().getEpochSecond();
        long amount = ((BigDecimal) w.get("amount")).setScale(0, RoundingMode.HALF_UP).longValue();
        try {
            String url = momoGateway.createPaymentUrl(ref, amount, "Chi tra hoa hong affiliate ShopTech #" + withdrawalId,
                    props.backendUrl("/api/payments/momo/affiliate-return"));
            jdbc.update("UPDATE affiliate_withdrawals SET payout_reference = :ref, reviewed_by = :r WHERE id = :id",
                    new MapSqlParameterSource().addValue("ref", ref).addValue("r", reviewerId).addValue("id", withdrawalId));
            return url;
        } catch (PaymentGatewayException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
    }

    /** MoMo báo thanh toán thành công → ghi nhận đã chi trả. @return true nếu tìm thấy yêu cầu đang chờ. */
    @Transactional
    public boolean finalizeByReference(String reference) {
        if (reference == null) {
            return false;
        }
        int changed = jdbc.update("""
                UPDATE affiliate_withdrawals SET status = 'approved', note = 'Đã chi trả qua MoMo',
                       reviewed_at = :now, updated_at = :now
                WHERE payout_reference = :ref AND status = 'pending'
                """, new MapSqlParameterSource().addValue("ref", reference).addValue("now", Timestamp.from(Instant.now())));
        return changed > 0;
    }

    public String sellerRedirect(boolean success) {
        return props.adminUrl().replaceAll("/+$", "") + "/seller/affiliate?payout=" + (success ? "success" : "failed");
    }

    // ------------------------------------------------------------------ helpers

    private Map<String, Object> pendingWithdrawal(Long storeId, Long withdrawalId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM affiliate_withdrawals WHERE id = :id AND store_id = :s",
                new MapSqlParameterSource().addValue("id", withdrawalId).addValue("s", storeId));
        if (rows.isEmpty()) {
            throw ApiException.notFound("Không tìm thấy yêu cầu rút tiền");
        }
        if (!"pending".equals(rows.get(0).get("status"))) {
            throw ApiException.unprocessable("Yêu cầu này đã được xử lý rồi");
        }
        return rows.get(0);
    }

    private long count(String sql, MapSqlParameterSource params) {
        Long n = jdbc.queryForObject(sql, params, Long.class);
        return n == null ? 0 : n;
    }

    private BigDecimal sum(String sql, MapSqlParameterSource params) {
        BigDecimal v = jdbc.queryForObject(sql, params, BigDecimal.class);
        return v == null ? BigDecimal.ZERO : v;
    }

    private static Map<String, Object> ref(long id, String name) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("name", name);
        return m;
    }

    private static String iso(Timestamp ts) {
        return ts == null ? null : ts.toInstant().toString();
    }

    private static String money(long v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", symbols).format(v);
    }
}
