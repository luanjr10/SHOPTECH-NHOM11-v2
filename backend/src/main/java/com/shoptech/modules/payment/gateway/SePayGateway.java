package com.shoptech.modules.payment.gateway;

import com.shoptech.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

/** Cổng SePay: dựng form POST (có chữ ký) để trình duyệt tự gửi sang trang thanh toán. */
@Component
@RequiredArgsConstructor
public class SePayGateway {

    private static final List<String> SIGNED_FIELDS = List.of(
            "order_amount", "merchant", "currency", "operation",
            "order_description", "order_invoice_number", "customer_id",
            "payment_method", "success_url", "error_url", "cancel_url");

    private final AppProperties props;

    public record CheckoutForm(String action, Map<String, String> fields) {

        /** Trang HTML tự gửi form POST sang SePay (dùng cho cả thanh toán đơn hàng và giải ngân rút tiền). */
        public String autoSubmitHtml() {
            StringBuilder inputs = new StringBuilder();
            fields.forEach((k, v) -> inputs.append("<input type=\"hidden\" name=\"")
                    .append(HtmlUtils.htmlEscape(k)).append("\" value=\"").append(HtmlUtils.htmlEscape(v)).append("\">"));
            return """
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
                    """.formatted(HtmlUtils.htmlEscape(action), inputs);
        }
    }

    public CheckoutForm checkoutForm(String invoiceNumber, long amount, String description,
                                     String successUrl, String errorUrl, String cancelUrl) {
        var cfg = props.payment().sepay();
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("order_amount", String.valueOf(amount));
        fields.put("merchant", cfg.merchantId());
        fields.put("currency", "VND");
        fields.put("operation", "PURCHASE");
        fields.put("order_description", description);
        fields.put("order_invoice_number", invoiceNumber);
        fields.put("success_url", successUrl);
        fields.put("error_url", errorUrl);
        fields.put("cancel_url", cancelUrl);

        StringJoiner signed = new StringJoiner(",");
        for (String f : SIGNED_FIELDS) {
            if (fields.containsKey(f)) {
                signed.add(f + "=" + fields.get(f));
            }
        }
        fields.put("signature", Base64.getEncoder().encodeToString(
                Signatures.hmac("HmacSHA256", cfg.secretKey().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                        signed.toString())));
        return new CheckoutForm(cfg.checkoutUrl(), fields);
    }
}
