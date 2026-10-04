package com.shoptech.modules.auth.controller;

import com.shoptech.config.AppProperties;
import com.shoptech.modules.auth.service.GoogleAuthService;
import com.shoptech.security.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * /api/auth/google?app=admin|client → chuyển sang Google; Google gọi lại /api/auth/google/callback.
 * "state" = app:nonce, nonce được đối chiếu với cookie HttpOnly ngắn hạn để chống giả mạo đăng nhập.
 */
@RestController
@RequestMapping("/api/auth/google")
@RequiredArgsConstructor
public class GoogleAuthController {

    private static final String STATE_COOKIE = "google_oauth_state";

    private final GoogleAuthService googleAuthService;
    private final JwtService jwtService;
    private final AppProperties props;

    @GetMapping
    public ResponseEntity<Void> redirect(@RequestParam(required = false) String app) {
        String target = "admin".equals(app) ? "admin" : "client";
        String nonce = GoogleAuthService.newNonce();
        ResponseCookie stateCookie = ResponseCookie.from(STATE_COOKIE, nonce)
                .httpOnly(true).secure(props.jwt().cookieSecure()).sameSite("Lax").path("/api/auth/google")
                .maxAge(Duration.ofMinutes(10)).build();
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.SET_COOKIE, stateCookie.toString())
                .location(URI.create(googleAuthService.authorizationUrl(target + ":" + nonce)))
                .build();
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String code,
                                         @RequestParam(required = false) String state,
                                         HttpServletRequest request) {
        String[] parts = state == null ? new String[0] : state.split(":", 2);
        boolean admin = parts.length > 0 && "admin".equals(parts[0]);
        String base = googleAuthService.frontendBase(admin);
        ResponseCookie clearState = ResponseCookie.from(STATE_COOKIE, "").path("/api/auth/google").maxAge(0).build();

        String expected = cookie(request, STATE_COOKIE);
        boolean stateOk = parts.length == 2 && expected != null
                && MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), parts[1].getBytes(StandardCharsets.UTF_8));
        if (!stateOk || code == null) {
            return redirect(base + "/login?error=google", clearState, null);
        }

        GoogleAuthService.Result result = googleAuthService.handleCallback(code, admin);
        if (result.error() != null) {
            return redirect(base + "/login?error=" + result.error(), clearState, null);
        }
        String token = jwtService.issue(result.user().getId(), result.user().getTokenVersion());
        return redirect(base + "/", clearState, jwtService.cookie(token));
    }

    private static ResponseEntity<Void> redirect(String url, ResponseCookie clearState, ResponseCookie session) {
        var builder = ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.SET_COOKIE, clearState.toString())
                .location(URI.create(url));
        if (session != null) {
            builder.header(HttpHeaders.SET_COOKIE, session.toString());
        }
        return builder.build();
    }

    private static String cookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie c : request.getCookies()) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }
}
