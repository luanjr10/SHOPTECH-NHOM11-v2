package com.shoptech.modules.location.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Danh mục tỉnh/quận/phường theo mã của GHN (ProvinceID/DistrictID/WardCode), cache 24 giờ trong bộ nhớ.
 * Trả nguyên object GHN để frontend đọc ProvinceName/DistrictName/WardName như bản Laravel.
 */
@Service
@RequiredArgsConstructor
public class LocationService {

    private static final Duration TTL = Duration.ofHours(24);

    private record Cached(Instant expiresAt, List<Map<String, Object>> data) {
    }

    private final GhnClient ghn;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public List<Map<String, Object>> provinces() {
        return cached("provinces", () -> fetch("/shiip/public-api/master-data/province", Map.of()));
    }

    public List<Map<String, Object>> districtsOfProvince(long provinceId) {
        return cached("districts:" + provinceId,
                () -> fetch("/shiip/public-api/master-data/district", Map.of("province_id", provinceId)));
    }

    public List<Map<String, Object>> wardsOfDistrict(long districtId) {
        return cached("wards:" + districtId,
                () -> fetch("/shiip/public-api/master-data/ward", Map.of("district_id", districtId)));
    }

    public Map<String, Object> findProvince(long provinceId) {
        return find(provinces(), "ProvinceID", provinceId);
    }

    public Map<String, Object> findDistrict(long provinceId, long districtId) {
        return find(districtsOfProvince(provinceId), "DistrictID", districtId);
    }

    public Map<String, Object> findWard(long districtId, String wardCode) {
        return wardsOfDistrict(districtId).stream()
                .filter(w -> Objects.equals(String.valueOf(w.get("WardCode")), wardCode))
                .findFirst().orElse(null);
    }

    private static Map<String, Object> find(List<Map<String, Object>> rows, String key, long id) {
        return rows.stream()
                .filter(r -> r.get(key) instanceof Number n && n.longValue() == id)
                .findFirst().orElse(null);
    }

    private List<Map<String, Object>> cached(String key, Supplier<List<Map<String, Object>>> loader) {
        Cached hit = cache.get(key);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit.data();
        }
        List<Map<String, Object>> data = loader.get();
        cache.put(key, new Cached(Instant.now().plus(TTL), data));
        return data;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetch(String path, Map<String, ?> query) {
        Object data = ghn.get(path, query);
        return data instanceof List<?> list ? (List<Map<String, Object>>) list : List.of();
    }
}
