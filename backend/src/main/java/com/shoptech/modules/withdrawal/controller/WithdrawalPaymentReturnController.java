package com.shoptech.modules.withdrawal.controller;

import com.shoptech.modules.payment.gateway.MomoGateway;
import com.shoptech.modules.payment.gateway.OnePayGateway;
import com.shoptech.modules.payment.gateway.VnpayGateway;
import com.shoptech.modules.withdrawal.service.WithdrawalService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

/**
 * Cổng thanh toán chuyển trình duyệt của admin về đây sau khi giải ngân; kiểm tra chữ ký rồi
 * hoàn tất yêu cầu rút tiền và chuyển tiếp về trang quản trị.
 */
@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class WithdrawalPaymentReturnController {

    private final WithdrawalService withdrawalService;
    private final MomoGateway momoGateway;
    private final VnpayGateway vnpayGateway;
    private final OnePayGateway onePayGateway;
    private final AccessGuard accessGuard;

    @GetMapping("/momo/withdrawal-return")
    public ResponseEntity<Void> momo(@RequestParam Map<String, String> q) {
        boolean ok = momoGateway.verifyReturn(q) && momoGateway.isSuccess(q);
        return finish(ok, q.get("orderId"), "MoMo", q);
    }

    @GetMapping("/vnpay/withdrawal-return")
    public ResponseEntity<Void> vnpay(@RequestParam Map<String, String> q) {
        boolean ok = vnpayGateway.verifyReturn(q) && vnpayGateway.isSuccess(q);
        return finish(ok, q.get("vnp_TxnRef"), "VNPay", q);
    }

    @GetMapping("/onepay/withdrawal-return")
    public ResponseEntity<Void> onepay(@RequestParam Map<String, String> q) {
        boolean ok = onePayGateway.verifyReturn(q) && onePayGateway.isSuccess(q);
        return finish(ok, q.get("vpc_MerchTxnRef"), "OnePay", q);
    }

    /**
     * SePay chuyển về không kèm chữ ký, nên bắt buộc là chính admin (có quyền sửa "Rút tiền") đang đăng nhập
     * và yêu cầu đã được khởi tạo thanh toán SePay — tránh ai đó tự gọi link để duyệt khống.
     */
    @GetMapping("/sepay/withdrawal-return/{id}")
    public ResponseEntity<Void> sepay(@PathVariable Long id, @RequestParam(required = false) String status) {
        boolean allowed;
        try {
            allowed = accessGuard.module("withdrawals", "edit") && withdrawalService.isSepayPayoutInProgress(id);
        } catch (RuntimeException e) {
            allowed = false;
        }
        if (allowed && "success".equals(status)) {
            return redirect(withdrawalService.adminRedirect(withdrawalService.finalizePayout(id), true));
        }
        return redirect(withdrawalService.adminRedirect(id, false));
    }

    private ResponseEntity<Void> finish(boolean ok, String reference, String gateway, Map<String, String> q) {
        if (ok) {
            Long id = withdrawalService.finalizeByReference(reference);
            if (id != null) {
                return redirect(withdrawalService.adminRedirect(id, true));
            }
        }
        log.warn("{} withdrawal-return không hợp lệ hoặc thất bại: ref={}", gateway, reference);
        return redirect(withdrawalService.adminRedirect(null, false));
    }

    private static ResponseEntity<Void> redirect(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(url));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
