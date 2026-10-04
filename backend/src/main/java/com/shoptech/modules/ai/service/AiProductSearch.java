package com.shoptech.modules.ai.service;

import com.shoptech.common.util.Numbers;
import com.shoptech.modules.ai.dto.AiChatProduct;
import com.shoptech.modules.product.document.ProductImage;
import com.shoptech.modules.product.repository.ProductImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Tool "search_products" của chatbot: tìm sản phẩm thật theo từ khoá / danh mục / thương hiệu / khoảng giá. */
@Component
@RequiredArgsConstructor
public class AiProductSearch {

    private static final int DEFAULT_LIMIT = 5;
    private static final int MAX_LIMIT = 8;

    private final NamedParameterJdbcTemplate jdbc;
    private final ProductImageRepository imageRepository;

    public List<AiChatProduct> search(Map<String, Object> args) {
        String query = text(args.get("query"));
        String category = text(args.get("category"));
        String brand = text(args.get("brand"));

        // Nhiều sản phẩm chưa gắn thương hiệu / danh mục chuẩn: không có kết quả thì nới dần bộ lọc
        // (bỏ thương hiệu → bỏ danh mục), vẫn giữ từ khoá và khoảng giá.
        List<AiChatProduct> products = find(args, query, category, brand);
        if (products.isEmpty() && !brand.isEmpty()) {
            products = find(args, query, category, "");
        }
        if (products.isEmpty() && !category.isEmpty()) {
            products = find(args, query, "", "");
        }
        if (products.isEmpty()) {
            return products;
        }

        Map<Integer, String> thumbnails = imageRepository.findByProductIdIn(products.stream().map(AiChatProduct::id).toList())
                .stream().filter(pi -> pi.getImages() != null && !pi.getImages().isEmpty())
                .collect(Collectors.toMap(ProductImage::getProductId, pi -> pi.getImages().get(0), (a, b) -> a));
        return products.stream().map(p -> new AiChatProduct(p.id(), p.name(), p.slug(), p.price(), p.discountPercent(),
                p.finalPrice(), thumbnails.get(p.id()), p.stock(), p.category(), p.brand(), p.store())).toList();
    }

    private List<AiChatProduct> find(Map<String, Object> args, String query, String category, String brand) {
        StringBuilder sql = new StringBuilder("""
                SELECT p.id, p.name, p.slug, p.price, p.discount_percent, p.stock,
                       c.name AS category, b.name AS brand, s.name AS store
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN brands b ON b.id = p.brand_id
                LEFT JOIN stores s ON s.id = p.store_id
                WHERE p.status = 1
                """);
        MapSqlParameterSource params = new MapSqlParameterSource();
        if (!query.isEmpty()) {
            sql.append(" AND (p.name LIKE :q OR p.code LIKE :q)");
            params.addValue("q", "%" + query + "%");
        }
        if (!category.isEmpty()) {
            sql.append(" AND (c.name LIKE :cat OR c.slug LIKE :cat)");
            params.addValue("cat", "%" + category + "%");
        }
        if (!brand.isEmpty()) {
            sql.append(" AND (b.name LIKE :brand OR b.slug LIKE :brand)");
            params.addValue("brand", "%" + brand + "%");
        }
        BigDecimal min = number(args.get("min_price"));
        if (min != null) {
            sql.append(" AND p.price >= :min");
            params.addValue("min", min);
        }
        BigDecimal max = number(args.get("max_price"));
        if (max != null) {
            sql.append(" AND p.price <= :max");
            params.addValue("max", max);
        }
        sql.append(switch (text(args.get("sort"))) {
            case "price_asc" -> " ORDER BY p.price ASC";
            case "price_desc" -> " ORDER BY p.price DESC";
            default -> " ORDER BY p.created_at DESC";
        });
        BigDecimal limitArg = number(args.get("limit"));
        int limit = limitArg == null || limitArg.intValue() <= 0 ? DEFAULT_LIMIT : Math.min(limitArg.intValue(), MAX_LIMIT);
        sql.append(" LIMIT ").append(limit);

        return jdbc.query(sql.toString(), params, (rs, i) -> {
            BigDecimal price = rs.getBigDecimal("price");
            int discount = rs.getInt("discount_percent");
            return new AiChatProduct(rs.getInt("id"), rs.getString("name"), rs.getString("slug"), price, discount,
                    Numbers.finalPrice(price, discount), null, rs.getInt("stock"), rs.getString("category"),
                    rs.getString("brand"), rs.getString("store"));
        });
    }

    private static String text(Object v) {
        return v == null ? "" : v.toString().trim();
    }

    private static BigDecimal number(Object v) {
        if (v instanceof Number n) {
            return new BigDecimal(n.toString());
        }
        try {
            return v == null || v.toString().isBlank() ? null : new BigDecimal(v.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
