package com.shoptech.modules.payment.gateway;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;

/** Tiện ích ký HMAC dùng chung cho các cổng thanh toán. */
final class Signatures {

    private Signatures() {
    }

    static byte[] hmac(String algorithm, byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance(algorithm);
            mac.init(new SecretKeySpec(key, algorithm));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không thể tạo chữ ký " + algorithm, e);
        }
    }

    static String hmacHex(String algorithm, String key, String data) {
        return HexFormat.of().formatHex(hmac(algorithm, key.getBytes(StandardCharsets.UTF_8), data));
    }

    /** So sánh chuỗi chữ ký theo thời gian hằng để tránh tấn công dò thời gian. */
    static boolean safeEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }

    /** Mã hoá giống urlencode() của PHP (dấu cách → '+'). */
    static String formEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /** Mã hoá giống rawurlencode() của PHP (dấu cách → %20). */
    static String rawEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
