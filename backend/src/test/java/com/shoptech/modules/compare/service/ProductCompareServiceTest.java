package com.shoptech.modules.compare.service;

import com.shoptech.common.util.Json;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class ProductCompareServiceTest {

    private final ProductCompareService service =
            new ProductCompareService(null, null, null, null, mock(Json.class), "", "model");

    private static Map<String, Object> product(int id, String name, String price, boolean inStock, double rating, int reviews) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("final_price", new BigDecimal(price));
        m.put("in_stock", inStock);
        m.put("rating", rating);
        m.put("reviews_count", reviews);
        return m;
    }

    @Test
    void idsAreDeduplicatedCappedAtThreeAndKeepTheCustomersOrder() {
        assertThat(service.normalizeIds("5, 3,abc,5,0,-2,8,9")).containsExactly(5, 3, 8);
        assertThat(service.normalizeIds(null)).isEmpty();
        assertThat(service.normalizeIds("  ")).isEmpty();
    }

    @Test
    void basicVerdictNamesTheCheapestTheBestRatedAndOutOfStockProducts() {
        Map<String, Object> comparison = new LinkedHashMap<>();
        comparison.put("products", List.of(
                product(1, "Máy A", "20000000", true, 4.5, 10),
                product(2, "Máy B", "15000000", false, 0, 0)));
        comparison.put("highlights", Map.of("cheapest", 2, "best_rated", 1));

        String text = service.basicVerdict(comparison);

        assertThat(text).contains("Giá tốt nhất: Máy B (15.000.000đ)")
                .contains("Được đánh giá cao nhất: Máy A (4.5/5 từ 10 đánh giá)")
                .contains("Tạm hết hàng: Máy B");
    }
}
