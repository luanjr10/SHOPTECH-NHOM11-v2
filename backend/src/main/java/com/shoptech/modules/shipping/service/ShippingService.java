package com.shoptech.modules.shipping.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.modules.location.service.GhnClient;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Ước tính phí vận chuyển qua GHN, tách theo từng gian hàng (mỗi gian hàng giao một kiện riêng).
 * Gian hàng cùng tỉnh với người nhận: miễn phí, giao hoả tốc trong 2 giờ.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ShippingService {

    public static final int SERVICE_TYPE_ID = 2;
    private static final Duration SAME_PROVINCE_EXPRESS = Duration.ofHours(2);

    private final GhnClient ghn;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;

    public record Line(Integer productId, int quantity) {
    }

    public record StoreQuote(Long storeId, String storeName, long fee, int weight, int length, int width, int height,
                             Instant expectedDeliveryTime, boolean sameProvinceExpress) {
    }

    public record Quote(long totalFee, Instant expectedDeliveryTime, List<StoreQuote> byStore) {

        public long feeFor(Long storeId) {
            return byStore.stream().filter(q -> Objects.equals(q.storeId(), storeId)).mapToLong(StoreQuote::fee).sum();
        }
    }

    private record Package(int weight, int length, int width, int height) {
    }

    public Quote quoteCart(List<Line> items, long toDistrictId, String toWardCode, Long toProvinceId) {
        Map<Integer, Product> products = productRepository.findAllById(items.stream().map(Line::productId).toList())
                .stream().collect(Collectors.toMap(Product::getId, Function.identity()));

        Map<Long, List<Map.Entry<Product, Integer>>> byStore = new LinkedHashMap<>();
        for (Line item : items) {
            Product p = products.get(item.productId());
            if (p == null) {
                throw ApiException.unprocessable("Sản phẩm #" + item.productId() + " không tồn tại.");
            }
            if (p.getWeight() == null || p.getLength() == null || p.getWidth() == null || p.getHeight() == null) {
                throw ApiException.unprocessable("Sản phẩm \"" + p.getName()
                        + "\" chưa khai báo đầy đủ khối lượng/kích thước — không thể tính phí vận chuyển.");
            }
            if (p.getStoreId() == null) {
                throw ApiException.unprocessable("Sản phẩm \"" + p.getName() + "\" chưa gắn với gian hàng nào.");
            }
            byStore.computeIfAbsent(p.getStoreId(), k -> new ArrayList<>()).add(Map.entry(p, Math.max(1, item.quantity())));
        }

        long total = 0;
        Instant latestEta = null;
        List<StoreQuote> breakdown = new ArrayList<>();
        for (var entry : byStore.entrySet()) {
            Store store = storeRepository.findById(entry.getKey())
                    .orElseThrow(() -> ApiException.unprocessable("Gian hàng #" + entry.getKey() + " không tồn tại."));
            StoreQuote quote = feeForStore(store, toDistrictId, toWardCode, entry.getValue(), toProvinceId);
            total += quote.fee();
            breakdown.add(quote);
            if (quote.expectedDeliveryTime() != null
                    && (latestEta == null || quote.expectedDeliveryTime().isAfter(latestEta))) {
                latestEta = quote.expectedDeliveryTime();
            }
        }
        return new Quote(total, latestEta, breakdown);
    }

    private StoreQuote feeForStore(Store store, long toDistrictId, String toWardCode,
                                   List<Map.Entry<Product, Integer>> lines, Long toProvinceId) {
        if (store.getDistrictId() == null || store.getWardCode() == null) {
            throw ApiException.unprocessable("Gian hàng \"" + store.getName()
                    + "\" chưa cấu hình địa chỉ lấy hàng — không thể tính phí vận chuyển.");
        }
        Package pkg = packageFor(lines);

        if (toProvinceId != null && Objects.equals(store.getProvinceId(), toProvinceId)) {
            return new StoreQuote(store.getId(), store.getName(), 0, pkg.weight(), pkg.length(), pkg.width(), pkg.height(),
                    Instant.now().plus(SAME_PROVINCE_EXPRESS), true);
        }

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("from_district_id", store.getDistrictId());
        params.put("from_ward_code", store.getWardCode());
        params.put("to_district_id", toDistrictId);
        params.put("to_ward_code", toWardCode);
        params.put("service_type_id", SERVICE_TYPE_ID);
        params.put("weight", pkg.weight());
        params.put("length", pkg.length());
        params.put("width", pkg.width());
        params.put("height", pkg.height());
        Object feeData = ghn.post("/shiip/public-api/v2/shipping-order/fee", params);
        long fee = feeData instanceof Map<?, ?> m && m.get("total") instanceof Number n ? n.longValue() : 0;

        return new StoreQuote(store.getId(), store.getName(), fee, pkg.weight(), pkg.length(), pkg.width(), pkg.height(),
                leadTime(store, toDistrictId, toWardCode), false);
    }

    /** Thời gian giao dự kiến; lỗi thì bỏ qua (không chặn việc tính phí). */
    private Instant leadTime(Store store, long toDistrictId, String toWardCode) {
        try {
            Map<String, Object> params = new LinkedHashMap<>();
            params.put("from_district_id", store.getDistrictId());
            params.put("from_ward_code", store.getWardCode());
            params.put("to_district_id", toDistrictId);
            params.put("to_ward_code", toWardCode);
            params.put("service_type_id", SERVICE_TYPE_ID);
            Object data = ghn.post("/shiip/public-api/v2/shipping-order/leadtime", params);
            return data instanceof Map<?, ?> m && m.get("leadtime") instanceof Number n
                    ? Instant.ofEpochSecond(n.longValue()) : null;
        } catch (RuntimeException e) {
            log.warn("GHN leadtime không lấy được: {}", e.getMessage());
            return null;
        }
    }

    /** Gộp kiện: cộng khối lượng + chiều cao, lấy chiều dài/rộng lớn nhất. */
    private static Package packageFor(List<Map.Entry<Product, Integer>> lines) {
        int weight = 0;
        int length = 0;
        int width = 0;
        int height = 0;
        for (var line : lines) {
            Product p = line.getKey();
            int qty = line.getValue();
            weight += p.getWeight() * qty;
            length = Math.max(length, p.getLength());
            width = Math.max(width, p.getWidth());
            height += p.getHeight() * qty;
        }
        return new Package(Math.max(1, weight), Math.max(1, length), Math.max(1, width), Math.max(1, height));
    }
}
