package com.shoptech.modules.payment.gateway;

import com.shoptech.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Map;
import java.util.StringJoiner;
import java.util.TreeMap;

/** Cổng VNPay (API 2.1.0): tạo URL thanh toán ký HMAC-SHA512 và kiểm tra chữ ký trả về. */
@Component
@RequiredArgsConstructor
public class VnpayGateway {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final AppProperties props;

    public String createPaymentUrl(String txnRef, long amount, String orderInfo, String returnUrl, String clientIp) {
        var cfg = props.payment().vnpay();
        ZonedDateTime now = ZonedDateTime.now(VN);
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", cfg.tmnCode());
        params.put("vnp_Amount", String.valueOf(amount * 100));
        params.put("vnp_CreateDate", now.format(FORMAT));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_ExpireDate", now.plusMinutes(15).format(FORMAT));
        params.put("vnp_IpAddr", clientIp == null || clientIp.isBlank() ? "127.0.0.1" : clientIp);
        params.put("vnp_Locale", "vn");
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_TxnRef", txnRef);

        String query = encode(params);
        return cfg.url() + "?" + query + "&vnp_SecureHash=" + sign(query, cfg.hashSecret());
    }

    public boolean verifyReturn(Map<String, String> q) {
        Map<String, String> params = new TreeMap<>(q);
        String secureHash = params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");
        return Signatures.safeEquals(sign(encode(params), props.payment().vnpay().hashSecret()), secureHash);
    }

    public boolean isSuccess(Map<String, String> q) {
        return "00".equals(q.get("vnp_ResponseCode"));
    }

    private static String encode(Map<String, String> sorted) {
        StringJoiner joiner = new StringJoiner("&");
        sorted.forEach((k, v) -> joiner.add(Signatures.formEncode(k) + "=" + Signatures.formEncode(v == null ? "" : v)));
        return joiner.toString();
    }

    private static String sign(String data, String secret) {
        return HexFormat.of().formatHex(Signatures.hmac("HmacSHA512",
                secret.getBytes(java.nio.charset.StandardCharsets.UTF_8), data));
    }
}
