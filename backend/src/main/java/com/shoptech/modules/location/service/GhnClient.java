package com.shoptech.modules.location.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/** Gọi API Giao Hàng Nhanh (header Token + ShopId). Mặc định trỏ STAGING. */
@Slf4j
@Component
public class GhnClient {

    private final AppProperties.Ghn config;
    private final RestClient restClient = RestClient.create();

    public GhnClient(AppProperties props) {
        this.config = props.ghn();
    }

    /** GET và trả về trường "data" của response GHN. */
    public Object get(String path, Map<String, ?> query) {
        return send(path, query, null);
    }

    /** POST JSON (tính phí, thời gian giao...) và trả về trường "data" của response GHN. */
    public Object post(String path, Map<String, ?> body) {
        return send(path, Map.of(), body);
    }

    private Object send(String path, Map<String, ?> query, Map<String, ?> jsonBody) {
        String baseUrl = config.apiUrl() == null ? "" : config.apiUrl().replaceAll("/+$", "");
        guardProduction(baseUrl);
        if (config.token() == null || config.token().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa cấu hình GHN_TOKEN — không thể gọi API Giao Hàng Nhanh.");
        }

        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(baseUrl + path);
        query.forEach(uri::queryParam);

        try {
            var request = (jsonBody == null ? restClient.get() : restClient.post())
                    .uri(uri.build().toUri())
                    .headers(h -> {
                        h.set("Token", config.token());
                        if (config.shopId() != null && !config.shopId().isBlank()) {
                            h.set("ShopId", config.shopId());
                        }
                    });
            if (jsonBody != null) {
                ((RestClient.RequestBodySpec) request).contentType(MediaType.APPLICATION_JSON).body(jsonBody);
            }
            Map<String, Object> body = request.retrieve().body(new ParameterizedTypeReference<>() {
            });
            if (body == null || !(body.get("code") instanceof Number code) || code.intValue() != 200) {
                throw new RestClientException(body == null ? "empty body" : String.valueOf(body.get("message")));
            }
            return body.get("data");
        } catch (RestClientException e) {
            log.error("GHN API lỗi {}: {}", path, e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "GHN: Không gọi được API Giao Hàng Nhanh, vui lòng thử lại.");
        }
    }

    /** Không để máy dev gọi nhầm GHN production (tạo vận đơn/phí thật). */
    private void guardProduction(String baseUrl) {
        boolean productionHost = baseUrl.contains("online-gateway.ghn.vn") && !baseUrl.contains("dev-online-gateway.ghn.vn");
        if (productionHost && !config.allowProduction()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "GHN_API_URL đang trỏ tới Production — dùng dev-online-gateway.ghn.vn khi dev/test "
                            + "hoặc đặt GHN_ALLOW_PRODUCTION=true nếu chắc chắn.");
        }
    }
}
