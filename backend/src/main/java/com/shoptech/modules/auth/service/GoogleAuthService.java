package com.shoptech.modules.auth.service;

import com.shoptech.config.AppProperties;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Đăng nhập bằng Google (OAuth 2.0 authorization code). */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private static final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
    /** Được đăng nhập trang quản trị (admin + nhân viên + người bán dùng Seller Center). */
    private static final Set<String> STAFF_ROLES = Set.of(User.ROLE_ADMIN, User.ROLE_EMPLOYEE, User.ROLE_SELLER);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AppProperties props;
    private final UserRepository userRepository;
    private final RestClient restClient = RestClient.create();

    /** Kết quả callback: người dùng đăng nhập được, hoặc mã lỗi để frontend hiển thị. */
    public record Result(User user, String error) {
    }

    public static String newNonce() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public String authorizationUrl(String state) {
        var google = props.google();
        return UriComponentsBuilder.fromUriString(AUTH_URL)
                .queryParam("client_id", google.clientId())
                .queryParam("redirect_uri", google.redirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", "openid email profile")
                .queryParam("state", state)
                .queryParam("prompt", "select_account")
                .encode().build().toUriString();
    }

    public String frontendBase(boolean admin) {
        return (admin ? props.adminUrl() : props.frontendUrl()).replaceAll("/+$", "");
    }

    @Transactional
    public Result handleCallback(String code, boolean admin) {
        Map<?, ?> profile;
        try {
            profile = fetchProfile(code);
        } catch (RestClientException | IllegalStateException e) {
            log.error("Google OAuth callback lỗi: {}", e.getMessage());
            return new Result(null, "google");
        }
        String googleId = String.valueOf(profile.get("sub"));
        String email = profile.get("email") == null ? null : profile.get("email").toString();
        String name = profile.get("name") == null ? null : profile.get("name").toString();
        String picture = profile.get("picture") == null ? null : profile.get("picture").toString();
        boolean emailVerified = Boolean.TRUE.equals(profile.get("email_verified"));

        User user = userRepository.findByGoogleId(googleId).orElse(null);
        // Chỉ liên kết với tài khoản có sẵn khi Google xác nhận email thuộc về người dùng.
        if (user == null && email != null && emailVerified) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                user.setGoogleId(googleId);
                user.setGoogleAvatar(picture);
            }
        }

        if (admin) {
            if (user == null) {
                return new Result(null, "google_not_registered");
            }
            if (!STAFF_ROLES.contains(user.getRole())) {
                return new Result(null, "google_no_access");
            }
        }

        if (user == null) {
            if (email == null || !emailVerified) {
                return new Result(null, "google");
            }
            user = new User();
            user.setName(name == null || name.isBlank() ? "Google User" : name);
            user.setUsername("google_" + newNonce().substring(0, 12).toLowerCase(Locale.ROOT));
            user.setEmail(email);
            user.setRole(User.ROLE_CUSTOMER);
            user.setGoogleId(googleId);
            user.setGoogleAvatar(picture);
            user.setEmailVerifiedAt(Instant.now());
            userRepository.save(user);
        }
        return new Result(user, null);
    }

    private Map<?, ?> fetchProfile(String code) {
        var google = props.google();
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", google.clientId());
        form.add("client_secret", google.clientSecret());
        form.add("redirect_uri", google.redirectUri());
        form.add("grant_type", "authorization_code");

        Map<?, ?> token = restClient.post().uri(TOKEN_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form).retrieve().body(Map.class);
        Object accessToken = token == null ? null : token.get("access_token");
        if (accessToken == null) {
            throw new IllegalStateException("Google không trả về access_token");
        }
        Map<?, ?> profile = restClient.get().uri(USERINFO_URL)
                .header("Authorization", "Bearer " + accessToken)
                .retrieve().body(Map.class);
        if (profile == null || profile.get("sub") == null) {
            throw new IllegalStateException("Không đọc được thông tin tài khoản Google");
        }
        return profile;
    }
}
