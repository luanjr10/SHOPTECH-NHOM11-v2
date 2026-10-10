package com.shoptech.modules.installment.controller;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.installment.service.InstallmentService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/** Trả góp phía khách: điều kiện của gian hàng (công khai), khoản vay của tôi và thanh toán từng kỳ qua MoMo. */
@Slf4j
@RestController
@RequiredArgsConstructor
public class InstallmentController {

    private final InstallmentService installmentService;
    private final NamedParameterJdbcTemplate jdbc;
    private final com.shoptech.config.AppProperties props;

    /** Điều kiện trả góp do gian hàng đặt (kỳ hạn, lãi, đơn tối thiểu) — công khai để trang sản phẩm hiển thị. */
    @GetMapping("/api/installments/options")
    public ApiResponse<Map<String, Object>> options(@RequestParam(name = "store_id", required = false) Long storeId) {
        if (storeId == null) {
            throw com.shoptech.common.exception.ValidationException.of("store_id", "Vui lòng chọn gian hàng");
        }
        String name = jdbc.queryForList("SELECT name FROM stores WHERE id = :id", new MapSqlParameterSource("id", storeId), String.class)
                .stream().findFirst().orElseThrow(() -> ApiException.notFound("Không tìm thấy gian hàng"));
        InstallmentService.Settings s = installmentService.settingsFor(storeId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("store_id", storeId);
        data.put("store_name", name);
        data.put("enabled", s.enabled());
        data.put("min_order", s.minOrder());
        data.put("options", s.options().stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("months", t.months());
            m.put("monthly_rate", t.monthlyRate());
            return m;
        }).collect(Collectors.toList()));
        return ApiResponse.ok(data);
    }

    @GetMapping("/api/installments/summary")
    public ApiResponse<Map<String, Object>> summary() {
        return ApiResponse.ok(installmentService.summary(AccessGuard.currentUser().id()));
    }

    @GetMapping("/api/installments")
    public ApiResponse<Map<String, Object>> index() {
        Long userId = AccessGuard.currentUser().id();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("plans", installmentService.plansOfUser(userId));
        data.put("summary", installmentService.summary(userId));
        return ApiResponse.ok(data);
    }

    @PostMapping("/api/installments/payments/{paymentId}/pay")
    public ApiResponse<Map<String, String>> pay(@PathVariable Long paymentId) {
        return ApiResponse.ok(Map.of("pay_url", installmentService.createPaymentUrl(AccessGuard.currentUser().id(), paymentId)));
    }

    /** MoMo gọi về bằng redirect (GET) và IPN (POST); cả hai dùng chung xử lý idempotent. */
    @GetMapping("/api/payments/momo/installment-return")
    public ResponseEntity<Void> momoRedirect(@RequestParam Map<String, String> q) {
        boolean ok = installmentService.handleMomo(q);
        if (!ok) {
            log.warn("MoMo trả góp: phản hồi không hợp lệ hoặc thất bại: orderId={}", q.get("orderId"));
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(props.frontendUrl().replaceAll("/+$", "") + "/tai-khoan/tra-gop?pay=" + (ok ? "success" : "failed")));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @PostMapping("/api/payments/momo/installment-return")
    public Map<String, Object> momoNotify(@RequestBody Map<String, Object> body) {
        Map<String, String> params = new LinkedHashMap<>();
        body.forEach((k, v) -> params.put(k, v == null ? "" : v.toString()));
        installmentService.handleMomo(params);
        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("partnerCode", params.get("partnerCode"));
        ack.put("resultCode", 0);
        ack.put("message", "success");
        return ack;
    }
}
