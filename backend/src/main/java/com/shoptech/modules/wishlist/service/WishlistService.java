package com.shoptech.modules.wishlist.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.mail.MailService;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.product.document.ProductImage;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductImageRepository;
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
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Danh sách yêu thích kèm báo giảm giá: khách đặt (hoặc không) mức giá mong muốn; khi giá hiệu dụng của sản phẩm
 * giảm xuống đạt mức đó, hệ thống gửi email — mỗi mức giá chỉ báo một lần (last_notified_price).
 */
@Service
@RequiredArgsConstructor
public class WishlistService {

    private final NamedParameterJdbcTemplate jdbc;
    private final ProductImageRepository imageRepository;
    private final MailService mailService;
    private final AppProperties props;

    /** Giá hiệu dụng = giá niêm yết trừ phần trăm giảm. */
    public static BigDecimal effectivePrice(BigDecimal price, int discountPercent) {
        BigDecimal p = price == null ? BigDecimal.ZERO : price;
        return p.subtract(p.multiply(BigDecimal.valueOf(discountPercent)).movePointLeft(2)).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Long userId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT w.target_price, w.created_at, p.id, p.name, p.slug, p.price, p.discount_percent, p.stock, p.status
                FROM wishlists w JOIN products p ON p.id = w.product_id WHERE w.user_id = :u ORDER BY w.created_at DESC, w.id DESC
                """, new MapSqlParameterSource("u", userId));
        Map<Integer, String> images = new HashMap<>();
        if (!rows.isEmpty()) {
            for (ProductImage pi : imageRepository.findByProductIdIn(rows.stream().map(r -> (Integer) r.get("id")).toList())) {
                if (pi.getImages() != null && !pi.getImages().isEmpty()) {
                    images.putIfAbsent(pi.getProductId(), pi.getImages().get(0));
                }
            }
        }
        return rows.stream().map(r -> {
            int discount = r.get("discount_percent") == null ? 0 : ((Number) r.get("discount_percent")).intValue();
            BigDecimal price = (BigDecimal) r.get("price");
            BigDecimal current = effectivePrice(price, discount);
            BigDecimal target = (BigDecimal) r.get("target_price");
            int stock = r.get("stock") == null ? 0 : ((Number) r.get("stock")).intValue();
            int status = r.get("status") == null ? 0 : ((Number) r.get("status")).intValue();
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("product_id", r.get("id"));
            out.put("name", r.get("name"));
            out.put("slug", r.get("slug"));
            out.put("image", images.get((Integer) r.get("id")));
            out.put("price", price);
            out.put("discount_percent", discount);
            out.put("current_price", current);
            out.put("in_stock", stock > 0 && status == 1);
            out.put("target_price", target);
            out.put("target_reached", target != null && current.compareTo(target) <= 0);
            out.put("added_at", r.get("created_at") == null ? null : ((Timestamp) r.get("created_at")).toInstant().toString());
            return out;
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<Integer> ids(Long userId) {
        return jdbc.queryForList("SELECT product_id FROM wishlists WHERE user_id = :u", new MapSqlParameterSource("u", userId), Integer.class);
    }

    /** Thêm vào yêu thích (hoặc cập nhật mức giá mong muốn nếu đã có và có gửi target_price). */
    @Transactional
    public Map<String, Object> add(Long userId, Integer productId, boolean hasTarget, BigDecimal targetPrice) {
        Long exists = jdbc.queryForObject("SELECT COUNT(*) FROM products WHERE id = :p", new MapSqlParameterSource("p", productId), Long.class);
        if (exists == null || exists == 0) {
            throw ApiException.notFound("Không tìm thấy sản phẩm");
        }
        Timestamp now = Timestamp.from(Instant.now());
        int created = jdbc.update("""
                INSERT IGNORE INTO wishlists (user_id, product_id, target_price, created_at, updated_at)
                VALUES (:u, :p, :t, :now, :now)
                """, new MapSqlParameterSource().addValue("u", userId).addValue("p", productId)
                .addValue("t", targetPrice).addValue("now", now));
        if (created == 0 && hasTarget) {
            jdbc.update("UPDATE wishlists SET target_price = :t, last_notified_price = NULL, updated_at = :now WHERE user_id = :u AND product_id = :p",
                    new MapSqlParameterSource().addValue("t", targetPrice).addValue("u", userId).addValue("p", productId).addValue("now", now));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user_id", userId);
        out.put("product_id", productId);
        out.put("target_price", targetPrice);
        return out;
    }

    @Transactional
    public Map<String, Object> updateTarget(Long userId, Integer productId, BigDecimal targetPrice) {
        int changed = jdbc.update("UPDATE wishlists SET target_price = :t, last_notified_price = NULL, updated_at = :now WHERE user_id = :u AND product_id = :p",
                new MapSqlParameterSource().addValue("t", targetPrice).addValue("u", userId).addValue("p", productId)
                        .addValue("now", Timestamp.from(Instant.now())));
        if (changed == 0) {
            throw ApiException.notFound("Sản phẩm không có trong danh sách yêu thích");
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("product_id", productId);
        out.put("target_price", targetPrice);
        return out;
    }

    @Transactional
    public void remove(Long userId, Integer productId) {
        jdbc.update("DELETE FROM wishlists WHERE user_id = :u AND product_id = :p",
                new MapSqlParameterSource().addValue("u", userId).addValue("p", productId));
    }

    // ------------------------------------------------------------------ báo giảm giá

    /** Gọi sau khi sản phẩm đổi giá / % giảm: báo cho người đang theo dõi nếu giá hiệu dụng giảm. */
    public int onPriceChanged(Product product, BigDecimal oldPrice, int oldDiscount) {
        BigDecimal oldEffective = effectivePrice(oldPrice, oldDiscount);
        BigDecimal newEffective = effectivePrice(product.getPrice(), product.getDiscountPercent() == null ? 0 : product.getDiscountPercent());
        return notifyWatchers(product, oldEffective, newEffective);
    }

    public int notifyWatchers(Product product, BigDecimal oldPrice, BigDecimal newPrice) {
        if (newPrice.compareTo(oldPrice) >= 0) {
            return 0;
        }
        List<Map<String, Object>> watchers = jdbc.queryForList("""
                SELECT w.id, w.target_price, w.last_notified_price, u.email, u.name
                FROM wishlists w JOIN users u ON u.id = w.user_id WHERE w.product_id = :p
                """, new MapSqlParameterSource("p", product.getId()));
        int notified = 0;
        for (Map<String, Object> w : watchers) {
            BigDecimal target = (BigDecimal) w.get("target_price");
            BigDecimal last = (BigDecimal) w.get("last_notified_price");
            if (target != null && newPrice.compareTo(target) > 0) {
                continue;
            }
            if (last != null && newPrice.compareTo(last) >= 0) {
                continue;
            }
            if (w.get("email") == null) {
                continue;
            }
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("name", w.get("name") == null ? "" : w.get("name"));
            vars.put("productName", product.getName());
            vars.put("oldPrice", money(oldPrice) + "đ");
            vars.put("newPrice", money(newPrice) + "đ");
            vars.put("targetReached", target != null);
            vars.put("url", props.frontendUrl().replaceAll("/+$", "") + "/san-pham/"
                    + (product.getSlug() == null || product.getSlug().isBlank() ? product.getId() : product.getSlug()));
            mailService.sendQuietly((String) w.get("email"), "Giá giảm: " + product.getName() + " — ShopTech", "price-drop", vars);
            jdbc.update("UPDATE wishlists SET last_notified_price = :n, updated_at = :now WHERE id = :id",
                    new MapSqlParameterSource().addValue("n", newPrice).addValue("now", Timestamp.from(Instant.now())).addValue("id", w.get("id")));
            notified++;
        }
        return notified;
    }

    private static String money(BigDecimal v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", symbols).format(v);
    }
}
