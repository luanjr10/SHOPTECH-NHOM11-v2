package com.shoptech.modules.withdrawal.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.payment.gateway.SePayGateway;
import com.shoptech.modules.withdrawal.dto.WithdrawalResponse;
import com.shoptech.modules.withdrawal.service.WithdrawalService;
import com.shoptech.security.AccessGuard;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/withdrawals")
@RequiredArgsConstructor
public class WithdrawalController {

    private final WithdrawalService withdrawalService;

    @GetMapping
    @PreAuthorize("@access.module('withdrawals', 'view')")
    public ApiResponse<PagedResult<WithdrawalResponse>> index(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(withdrawalService.list(status, page, perPage));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("@access.module('withdrawals', 'edit')")
    public ApiResponse<WithdrawalResponse> approve(@PathVariable Long id) {
        return ApiResponse.ok("Đã duyệt yêu cầu rút tiền", withdrawalService.approve(id, AccessGuard.currentUser().id()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("@access.module('withdrawals', 'edit')")
    public ApiResponse<WithdrawalResponse> reject(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        return ApiResponse.ok("Đã từ chối yêu cầu rút tiền",
                withdrawalService.reject(id, body == null ? null : body.get("note"), AccessGuard.currentUser().id()));
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("@access.module('withdrawals', 'edit')")
    public ApiResponse<Map<String, String>> pay(@PathVariable Long id, HttpServletRequest request) {
        String url = withdrawalService.createPaymentUrl(id, AccessGuard.currentUser().id(), request.getRemoteAddr());
        return ApiResponse.ok(Map.of("pay_url", url));
    }

    /** Trang trung gian tự gửi form sang SePay (trình duyệt của admin mở trực tiếp). */
    @GetMapping(value = "/{id}/sepay-redirect", produces = MediaType.TEXT_HTML_VALUE)
    @PreAuthorize("@access.module('withdrawals', 'edit')")
    public ResponseEntity<String> sepayRedirect(@PathVariable Long id) {
        SePayGateway.CheckoutForm form = withdrawalService.sepayCheckout(id);
        StringBuilder inputs = new StringBuilder();
        form.fields().forEach((k, v) -> inputs.append("<input type=\"hidden\" name=\"")
                .append(HtmlUtils.htmlEscape(k)).append("\" value=\"").append(HtmlUtils.htmlEscape(v)).append("\">"));
        String html = """
                <!DOCTYPE html>
                <html lang="vi"><head><meta charset="UTF-8"><title>Đang chuyển đến SePay...</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
                font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f6f8fa;color:#1f2937}
                .box{text-align:center}.spinner{width:36px;height:36px;border:3px solid #e2e6ea;border-top-color:#0f8a5f;
                border-radius:50%%;margin:0 auto 16px;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style>
                </head><body><div class="box"><div class="spinner"></div><p>Đang chuyển đến cổng thanh toán SePay...</p>
                <form id="sepay-checkout-form" method="POST" action="%s">%s
                <noscript><button type="submit">Tiếp tục thanh toán</button></noscript></form></div>
                <script>document.getElementById('sepay-checkout-form').submit();</script></body></html>
                """.formatted(HtmlUtils.htmlEscape(form.action()), inputs);
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }
}
