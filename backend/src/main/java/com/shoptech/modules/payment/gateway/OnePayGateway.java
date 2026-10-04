package com.shoptech.modules.payment.gateway;

import com.shoptech.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.StringJoiner;
import java.util.TreeMap;

/** Cổng OnePay (nội địa): ký HMAC-SHA256 với khoá hex, chữ ký viết hoa. */
@Component
@RequiredArgsConstructor
public class OnePayGateway {

    private final AppProperties props;

    public String createPaymentUrl(String merchTxnRef, long amount, String orderInfo, String returnUrl, String clientIp) {
        var cfg = props.payment().onepay();
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vpc_Version", "2");
        params.put("vpc_Command", "pay");
        params.put("vpc_MerchTxnRef", merchTxnRef);
        params.put("vpc_Merchant", cfg.merchantId());
        params.put("vpc_AccessCode", cfg.accessCode());
        params.put("vpc_Amount", String.valueOf(amount * 100));
        params.put("vpc_Currency", "VND");
        params.put("vpc_Locale", "vn");
        params.put("vpc_ReturnURL", returnUrl);
        params.put("vpc_OrderInfo", orderInfo);
        params.put("vpc_TicketNo", clientIp == null || clientIp.isBlank() ? "127.0.0.1" : clientIp);
        if (cfg.againLink() != null && !cfg.againLink().isBlank()) {
            params.put("vpc_AgainLink", cfg.againLink());
        }
        params.put("vpc_SecureHash", sign(params, cfg.secureHashKey()));

        StringJoiner query = new StringJoiner("&");
        params.forEach((k, v) -> query.add(k + "=" + Signatures.rawEncode(v)));
        return cfg.domesticUrl() + "?" + query;
    }

    public boolean verifyReturn(Map<String, String> q) {
        Map<String, String> params = new LinkedHashMap<>(q);
        String secureHash = params.remove("vpc_SecureHash");
        return Signatures.safeEquals(sign(params, props.payment().onepay().secureHashKey()),
                secureHash == null ? null : secureHash.toUpperCase(Locale.ROOT));
    }

    public boolean isSuccess(Map<String, String> q) {
        return "0".equals(q.get("vpc_TxnResponseCode"));
    }

    private static String sign(Map<String, String> params, String hashCodeHex) {
        StringJoiner data = new StringJoiner("&");
        new TreeMap<>(params).forEach((k, v) -> data.add(k + "=" + v));
        byte[] key = HexFormat.of().parseHex(hashCodeHex);
        return HexFormat.of().withUpperCase().formatHex(Signatures.hmac("HmacSHA256", key, data.toString()));
    }
}
