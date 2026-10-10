package com.shoptech.modules.compare.service;

import com.shoptech.common.util.Json;
import com.shoptech.modules.product.document.ProductImage;
import com.shoptech.modules.product.document.ProductSpecification;
import com.shoptech.modules.product.repository.ProductImageRepository;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.product.repository.ProductSpecificationRepository;
import com.shoptech.modules.wishlist.service.WishlistService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * So sánh 2–3 sản phẩm: bảng thông số ghép theo tên, điểm nổi bật (rẻ nhất / đánh giá cao nhất) và lời tư vấn
 * do AI (Groq) viết dựa DUY NHẤT trên dữ liệu thật; không có khoá API hoặc lỗi thì dùng bản tóm tắt theo luật.
 */
@Slf4j
@Service
public class ProductCompareService {

    public static final int MIN_PRODUCTS = 2;
    public static final int MAX_PRODUCTS = 3;
    private static final String ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
    private static final Duration CACHE_TTL = Duration.ofHours(1);
    private static final String SYSTEM_PROMPT = """
            Bạn là chuyên gia tư vấn công nghệ của ShopTech. Dựa DUY NHẤT vào dữ liệu JSON được cung cấp (không bịa thêm thông số),
            hãy so sánh các sản phẩm bằng tiếng Việt, ngắn gọn (tối đa 120 từ):
            1. Một câu tổng quan về điểm khác biệt chính.
            2. Mỗi sản phẩm một dòng bắt đầu bằng "Chọn <tên rút gọn> nếu ..." nêu nhu cầu phù hợp.
            3. Nếu thông số thiếu để kết luận, nói rõ là chưa đủ dữ liệu. Không dùng markdown tiêu đề, chỉ dùng gạch đầu dòng "-".
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ProductImageRepository imageRepository;
    private final ProductSpecificationRepository specificationRepository;
    private final ProductRepository productRepository;
    private final Json json;
    private final String apiKey;
    private final String model;
    private final RestClient restClient = RestClient.create();
    private final ConcurrentHashMap<String, CachedVerdict> cache = new ConcurrentHashMap<>();

    private record CachedVerdict(Map<String, Object> value, Instant expiresAt) {
    }

    public ProductCompareService(NamedParameterJdbcTemplate jdbc, ProductImageRepository imageRepository,
                                 ProductSpecificationRepository specificationRepository, ProductRepository productRepository,
                                 Json json, @Value("${app.ai.groq.api-key:}") String apiKey,
                                 @Value("${app.ai.groq.model:openai/gpt-oss-120b}") String model) {
        this.jdbc = jdbc;
        this.imageRepository = imageRepository;
        this.specificationRepository = specificationRepository;
        this.productRepository = productRepository;
        this.json = json;
        this.apiKey = apiKey;
        this.model = model;
    }

    /** Lấy tối đa 3 id hợp lệ, không trùng, giữ thứ tự khách chọn. */
    public List<Integer> normalizeIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        LinkedHashSet<Integer> ids = new LinkedHashSet<>();
        for (String part : raw.split(",")) {
            try {
                int id = Integer.parseInt(part.trim());
                if (id > 0) {
                    ids.add(id);
                }
            } catch (NumberFormatException ignored) {
                // bỏ qua phần tử không phải số
            }
        }
        return ids.stream().limit(MAX_PRODUCTS).toList();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> compare(List<Integer> ids) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.id, p.name, p.slug, p.price, p.discount_percent, p.stock, b.name AS brand_name, s.name AS store_name
                FROM products p LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN stores s ON s.id = p.store_id
                WHERE p.id IN (:ids) AND p.status = 1
                """, new MapSqlParameterSource("ids", ids));
        List<Map<String, Object>> ordered = rows.stream()
                .sorted(Comparator.comparingInt(r -> ids.indexOf(((Number) r.get("id")).intValue()))).toList();
        List<Integer> productIds = ordered.stream().map(r -> ((Number) r.get("id")).intValue()).toList();

        Map<Integer, String> thumbs = new LinkedHashMap<>();
        Map<Integer, Map<String, String>> specTable = new LinkedHashMap<>();
        if (!productIds.isEmpty()) {
            for (ProductImage pi : imageRepository.findByProductIdIn(productIds)) {
                if (pi.getImages() != null && !pi.getImages().isEmpty()) {
                    thumbs.putIfAbsent(pi.getProductId(), pi.getImages().get(0));
                }
            }
            for (Integer id : productIds) {
                Map<String, String> map = new LinkedHashMap<>();
                specificationRepository.findFirstByProductId(id).map(ProductSpecification::getSpecifications)
                        .map(json::mapListOf).orElse(List.of()).forEach(spec -> {
                            String name = spec.get("name") == null ? "" : spec.get("name").toString().trim();
                            if (!name.isEmpty()) {
                                map.put(name, spec.get("value") == null ? "" : spec.get("value").toString().trim());
                            }
                        });
                specTable.put(id, map);
            }
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> r : ordered) {
            int id = ((Number) r.get("id")).intValue();
            int discount = r.get("discount_percent") == null ? 0 : ((Number) r.get("discount_percent")).intValue();
            BigDecimal price = (BigDecimal) r.get("price");
            double[] rating = rating(id);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", id);
            m.put("name", r.get("name"));
            m.put("slug", r.get("slug"));
            m.put("thumbnail", thumbs.get(id));
            m.put("price", price);
            m.put("discount_percent", discount);
            m.put("final_price", WishlistService.effectivePrice(price, discount));
            m.put("brand", r.get("brand_name"));
            m.put("store", r.get("store_name"));
            m.put("in_stock", r.get("stock") != null && ((Number) r.get("stock")).intValue() > 0);
            m.put("rating", rating[0]);
            m.put("reviews_count", (int) rating[1]);
            items.add(m);
        }

        LinkedHashSet<String> names = specTable.values().stream().flatMap(m -> m.keySet().stream())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<Map<String, Object>> table = new ArrayList<>();
        for (String name : names) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", name);
            row.put("values", productIds.stream().map(id -> specTable.get(id).get(name)).collect(Collectors.toList()));
            table.add(row);
        }

        Map<String, Object> highlights = new LinkedHashMap<>();
        highlights.put("cheapest", items.stream().min(Comparator.comparing(i -> (BigDecimal) i.get("final_price")))
                .map(i -> i.get("id")).orElse(null));
        highlights.put("best_rated", items.stream().filter(i -> (int) i.get("reviews_count") > 0)
                .max(Comparator.comparingDouble(i -> (double) i.get("rating"))).map(i -> i.get("id")).orElse(null));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("products", items);
        out.put("rows", table);
        out.put("highlights", highlights);
        return out;
    }

    /** Lời tư vấn so sánh; cache 1 giờ theo nội dung so sánh. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> verdict(List<Integer> ids) {
        Map<String, Object> comparison = compare(ids);
        List<Map<String, Object>> products = (List<Map<String, Object>>) comparison.get("products");
        if (products.size() < MIN_PRODUCTS) {
            return Map.of("text", "Cần ít nhất 2 sản phẩm để so sánh.", "source", "basic");
        }
        String key = Integer.toHexString(Objects.hash(json.write(products), json.write(comparison.get("rows"))));
        CachedVerdict cached = cache.get(key);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached.value();
        }
        String ai = askAi(comparison);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("text", ai != null ? ai : basicVerdict(comparison));
        result.put("source", ai != null ? "ai" : "basic");
        cache.put(key, new CachedVerdict(result, Instant.now().plus(CACHE_TTL)));
        return result;
    }

    /** Tóm tắt theo luật khi chưa có AI. */
    @SuppressWarnings("unchecked")
    public String basicVerdict(Map<String, Object> comparison) {
        List<Map<String, Object>> products = (List<Map<String, Object>>) comparison.get("products");
        Map<String, Object> highlights = (Map<String, Object>) comparison.get("highlights");
        List<String> lines = new ArrayList<>();
        products.stream().filter(p -> p.get("id").equals(highlights.get("cheapest"))).findFirst().ifPresent(p ->
                lines.add("- Giá tốt nhất: " + p.get("name") + " (" + money((BigDecimal) p.get("final_price")) + "đ)."));
        products.stream().filter(p -> p.get("id").equals(highlights.get("best_rated"))).findFirst().ifPresent(p ->
                lines.add("- Được đánh giá cao nhất: " + p.get("name") + " (" + p.get("rating") + "/5 từ " + p.get("reviews_count") + " đánh giá)."));
        List<String> outOfStock = products.stream().filter(p -> Boolean.FALSE.equals(p.get("in_stock")))
                .map(p -> String.valueOf(p.get("name"))).toList();
        if (!outOfStock.isEmpty()) {
            lines.add("- Tạm hết hàng: " + String.join(", ", outOfStock) + ".");
        }
        lines.add("- Hãy đối chiếu bảng thông số bên trên để chọn sản phẩm khớp nhu cầu của bạn.");
        return String.join("\n", lines);
    }

    @SuppressWarnings("unchecked")
    private String askAi(Map<String, Object> comparison) {
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }
        List<Map<String, Object>> products = (List<Map<String, Object>>) comparison.get("products");
        List<Map<String, Object>> rows = (List<Map<String, Object>>) comparison.get("rows");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("san_pham", products.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ten", p.get("name"));
            m.put("gia", p.get("final_price"));
            m.put("thuong_hieu", p.get("brand"));
            m.put("danh_gia", (int) p.get("reviews_count") > 0 ? p.get("rating") : null);
            m.put("con_hang", p.get("in_stock"));
            return m;
        }).toList());
        payload.put("thong_so", rows.stream().limit(25).map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("muc", r.get("name"));
            m.put("gia_tri", r.get("values"));
            return m;
        }).toList());

        try {
            Map<?, ?> response = restClient.post().uri(ENDPOINT).contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> h.setBearerAuth(apiKey))
                    .body(Map.of("model", model, "temperature", 0.3, "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_PROMPT),
                            Map.of("role", "user", "content", json.write(payload)))))
                    .retrieve().body(Map.class);
            List<?> choices = response == null ? null : (List<?>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                return null;
            }
            Object message = ((Map<?, ?>) choices.get(0)).get("message");
            Object content = message instanceof Map<?, ?> m ? m.get("content") : null;
            String text = content == null ? "" : content.toString().trim();
            return text.isEmpty() ? null : text;
        } catch (RestClientException | ClassCastException e) {
            log.warn("So sánh AI: lỗi gọi Groq: {}", e.getMessage());
            return null;
        }
    }

    /** [điểm trung bình (1 chữ số thập phân), số đánh giá] */
    private double[] rating(int productId) {
        long count = 0;
        long weighted = 0;
        for (Object[] row : productRepository.ratingBreakdown(productId)) {
            int star = ((Number) row[0]).intValue();
            long n = ((Number) row[1]).longValue();
            count += n;
            weighted += star * n;
        }
        double average = count == 0 ? 0 : Math.round(weighted * 10.0 / count) / 10.0;
        return new double[]{average, count};
    }

    private static String money(BigDecimal v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", symbols).format(v);
    }
}
