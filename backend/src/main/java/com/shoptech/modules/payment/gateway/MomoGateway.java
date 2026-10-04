package com.shoptech.modules.payment.gateway;

import com.shoptech.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.LinkedHashMap;
import java.util.Map;

/** Cổng MoMo (API v2 "payWithMethod"): tạo link thanh toán và kiểm tra chữ ký khi MoMo chuyển hướng về. */
@Component
@RequiredArgsConstructor
public class MomoGateway {

    private final AppProperties props;
    private final RestClient restClient = RestClient.create();

    /** @return payUrl để chuyển người dùng sang trang thanh toán MoMo */
    public String createPaymentUrl(String orderId, long amount, String orderInfo, String redirectUrl) {
        return createPaymentUrl(orderId, amount, orderInfo, redirectUrl, redirectUrl);
    }

    /** @param ipnUrl MoMo gọi server-to-server báo kết quả (không tới được localhost khi chạy local) */
    public String createPaymentUrl(String orderId, long amount, String orderInfo, String redirectUrl, String ipnUrl) {
        var cfg = props.payment().momo();
        String amountStr = String.valueOf(amount);
        String extraData = "";
        String raw = "accessKey=" + cfg.accessKey()
                + "&amount=" + amountStr
                + "&extraData=" + extraData
                + "&ipnUrl=" + ipnUrl
                + "&orderId=" + orderId
                + "&orderInfo=" + orderInfo
                + "&partnerCode=" + cfg.partnerCode()
                + "&redirectUrl=" + redirectUrl
                + "&requestId=" + orderId
                + "&requestType=payWithMethod";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", cfg.partnerCode());
        body.put("partnerName", "ShopTech");
        body.put("storeId", "ShopTechStore");
        body.put("requestId", orderId);
        body.put("amount", amountStr);
        body.put("orderId", orderId);
        body.put("orderInfo", orderInfo);
        body.put("redirectUrl", redirectUrl);
        body.put("ipnUrl", ipnUrl);
        body.put("lang", "vi");
        body.put("autoCapture", true);
        body.put("extraData", extraData);
        body.put("requestType", "payWithMethod");
        body.put("signature", Signatures.hmacHex("HmacSHA256", cfg.secretKey(), raw));

        Map<?, ?> result;
        try {
            result = restClient.post().uri(cfg.endpoint()).contentType(MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(Map.class);
        } catch (RestClientException e) {
            throw new PaymentGatewayException("Không kết nối được cổng thanh toán MoMo", e);
        }
        Object payUrl = result == null ? null : result.get("payUrl");
        Object code = result == null ? null : result.get("resultCode");
        if (payUrl == null || !(code instanceof Number n) || n.intValue() != 0) {
            Object message = result == null ? null : result.get("message");
            throw new PaymentGatewayException(message != null ? message.toString() : "Không tạo được yêu cầu thanh toán MoMo");
        }
        return payUrl.toString();
    }

    public boolean verifyReturn(Map<String, String> q) {
        var cfg = props.payment().momo();
        String raw = "accessKey=" + cfg.accessKey()
                + "&amount=" + q.getOrDefault("amount", "")
                + "&extraData=" + q.getOrDefault("extraData", "")
                + "&message=" + q.getOrDefault("message", "")
                + "&orderId=" + q.getOrDefault("orderId", "")
                + "&orderInfo=" + q.getOrDefault("orderInfo", "")
                + "&orderType=" + q.getOrDefault("orderType", "")
                + "&partnerCode=" + cfg.partnerCode()
                + "&payType=" + q.getOrDefault("payType", "")
                + "&requestId=" + q.getOrDefault("requestId", "")
                + "&responseTime=" + q.getOrDefault("responseTime", "")
                + "&resultCode=" + q.getOrDefault("resultCode", "")
                + "&transId=" + q.getOrDefault("transId", "");
        return Signatures.safeEquals(Signatures.hmacHex("HmacSHA256", cfg.secretKey(), raw), q.get("signature"));
    }

    public boolean isSuccess(Map<String, String> q) {
        return "0".equals(q.get("resultCode"));
    }

    public String partnerCode() {
        return props.payment().momo().partnerCode();
    }
}
