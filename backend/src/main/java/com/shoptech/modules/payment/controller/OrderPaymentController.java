package com.shoptech.modules.payment.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.payment.service.OrderPaymentService;
import com.shoptech.security.AccessGuard;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thanh toán đơn hàng qua MoMo / VNPay. Tạo link cần đăng nhập; trang return / IPN do cổng gọi nên công khai
 * (tính hợp lệ được kiểm bằng chữ ký bên trong service).
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class OrderPaymentController {

    private final OrderPaymentService paymentService;

    public record CreateRequest(Long orderId) {
    }

    @PostMapping("/momo/create")
    public ApiResponse<Map<String, String>> momoCreate(@RequestBody CreateRequest request) {
        return ApiResponse.ok(Map.of("pay_url",
                paymentService.createMomoUrl(AccessGuard.currentUser().id(), request.orderId())));
    }

    @PostMapping("/vnpay/create")
    public ApiResponse<Map<String, String>> vnpayCreate(@RequestBody CreateRequest request, HttpServletRequest http) {
        return ApiResponse.ok(Map.of("pay_url",
                paymentService.createVnpayUrl(AccessGuard.currentUser().id(), request.orderId(), clientIp(http))));
    }

    /** VNPay cần IPv4; loopback IPv6 khi chạy local đổi về 127.0.0.1. */
    private static String clientIp(HttpServletRequest http) {
        String ip = http.getRemoteAddr();
        return ip == null || ip.contains(":") ? "127.0.0.1" : ip;
    }

    @GetMapping("/momo/return")
    public ResponseEntity<Void> momoReturn(@RequestParam Map<String, String> params) {
        return redirect(paymentService.frontendResultUrl(paymentService.handleMomo(params)));
    }

    /** IPN của MoMo (JSON). Luôn trả 200 để MoMo không gửi lại. */
    @PostMapping("/momo/notify")
    public Map<String, Object> momoNotify(@RequestBody Map<String, Object> body) {
        Map<String, String> params = new LinkedHashMap<>();
        body.forEach((k, v) -> params.put(k, v == null ? "" : String.valueOf(v)));
        paymentService.handleMomo(params);
        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("partnerCode", params.get("partnerCode"));
        ack.put("resultCode", 0);
        ack.put("message", "success");
        return ack;
    }

    @GetMapping("/vnpay/return")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> params) {
        return redirect(paymentService.frontendResultUrl(paymentService.handleVnpay(params)));
    }

    private static ResponseEntity<Void> redirect(String url) {
        return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, url).build();
    }
}
