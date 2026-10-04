package com.shoptech.modules.payment.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.payment.service.OrderPaymentService;
import com.shoptech.security.AccessGuard;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thanh toán đơn hàng qua MoMo / VNPay / OnePay / SePay. Tạo link cần đăng nhập; trang return / IPN
 * do cổng gọi nên công khai (tính hợp lệ được kiểm bằng chữ ký / khoá bí mật bên trong service).
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

    // ------------------------------------------------------------------ OnePay

    @PostMapping("/onepay/create")
    public ApiResponse<Map<String, String>> onepayCreate(@RequestBody CreateRequest request, HttpServletRequest http) {
        return ApiResponse.ok(Map.of("pay_url",
                paymentService.createOnepayUrl(AccessGuard.currentUser().id(), request.orderId(), clientIp(http))));
    }

    @GetMapping("/onepay/return")
    public ResponseEntity<Void> onepayReturn(@RequestParam Map<String, String> params) {
        return redirect(paymentService.frontendResultUrl(paymentService.handleOnepay(params)));
    }

    // ------------------------------------------------------------------ SePay

    @PostMapping("/sepay/create")
    public ApiResponse<Map<String, String>> sepayCreate(@RequestBody CreateRequest request) {
        return ApiResponse.ok(Map.of("pay_url",
                paymentService.createSepayUrl(AccessGuard.currentUser().id(), request.orderId())));
    }

    /** Trang trung gian tự gửi form có chữ ký sang SePay. */
    @GetMapping(value = "/sepay/redirect/{orderId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> sepayRedirect(@PathVariable Long orderId) {
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML)
                .body(paymentService.sepayCheckoutForm(orderId).autoSubmitHtml());
    }

    @GetMapping("/sepay/return")
    public ResponseEntity<Void> sepayReturn(@RequestParam(name = "order", required = false) Long orderId,
                                            @RequestParam(required = false) String status) {
        return redirect(paymentService.frontendResultUrl(paymentService.sepayReturn(orderId, status)));
    }

    /** IPN của SePay (xác thực bằng header X-Secret-Key). */
    @PostMapping("/sepay/webhook")
    public Map<String, Object> sepayWebhook(@RequestHeader(name = "X-Secret-Key", required = false) String secret,
                                            @RequestBody Map<String, Object> payload) {
        return Map.of("success", true, "message", paymentService.handleSepayWebhook(secret, payload));
    }

    private static ResponseEntity<Void> redirect(String url) {
        return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, url).build();
    }
}
