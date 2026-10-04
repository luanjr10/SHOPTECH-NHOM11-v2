package com.shoptech.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String url,
        String adminUrl,
        String frontendUrl,
        List<String> frontendUrls,
        Jwt jwt,
        String cloudinaryUrl,
        Mail mail,
        Google google,
        Payment payment,
        Auth auth,
        Ghn ghn
) {

    public record Jwt(String secret, long ttlMinutes, String cookieName, boolean cookieSecure, long refreshTtlMinutes) {
    }

    public record Mail(String fromAddress, String fromName) {
    }

    /** OAuth Google: redirect-uri phải khớp với URI đã khai báo trong Google Cloud Console. */
    public record Google(String clientId, String clientSecret, String redirectUri) {
    }

    public record Auth(int resetCodeTtlSeconds, int verifyEmailTtlMinutes) {
    }

    /** Giao Hàng Nhanh — dữ liệu tỉnh/quận/phường cho địa chỉ lấy hàng. allowProduction=false chặn gọi nhầm môi trường thật. */
    public record Ghn(String apiUrl, String token, String shopId, boolean allowProduction) {
    }

    public record Payment(Momo momo, Vnpay vnpay, OnePay onepay, SePay sepay) {

        public record Momo(String endpoint, String partnerCode, String accessKey, String secretKey) {
        }

        public record Vnpay(String url, String tmnCode, String hashSecret) {
        }

        public record OnePay(String domesticUrl, String merchantId, String accessCode, String secureHashKey, String againLink) {
        }

        public record SePay(String merchantId, String secretKey, String checkoutUrl) {
        }
    }

    /** URL công khai của file trong thư mục storage (URL tuyệt đối thì giữ nguyên). */
    public String publicStorageUrl(String path) {
        if (path == null || path.isBlank()) {
            return null;
        }
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        return url.replaceAll("/+$", "") + "/storage/" + path.replaceAll("^/+", "");
    }

    /** URL tuyệt đối tới API backend (dùng cho link trả về từ cổng thanh toán, link xác thực email...). */
    public String backendUrl(String path) {
        return url.replaceAll("/+$", "") + path;
    }
}
