package com.shoptech.modules.auth.controller;

import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.ratelimit.RateLimiter;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.auth.dto.AuthRequests;
import com.shoptech.modules.auth.dto.LoginRequest;
import com.shoptech.modules.auth.dto.LoginResponse;
import com.shoptech.modules.auth.service.AuthService;
import com.shoptech.modules.auth.service.EmailVerificationService;
import com.shoptech.modules.auth.service.PasswordResetService;
import com.shoptech.modules.user.dto.CurrentUserResponse;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.service.UserQueryService;
import com.shoptech.security.AccessGuard;
import com.shoptech.security.AuthUser;
import com.shoptech.security.JwtAuthenticationFilter;
import com.shoptech.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserQueryService userQueryService;
    private final JwtService jwtService;
    private final JwtAuthenticationFilter jwtFilter;
    private final PasswordResetService passwordResetService;
    private final EmailVerificationService emailVerificationService;
    private final RequestValidator requestValidator;
    private final RateLimiter rateLimiter;

    @PostMapping("/api/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@RequestBody LoginRequest request, HttpServletRequest http) {
        rateLimiter.check("login:" + http.getRemoteAddr(), 20);
        return withCookie(HttpStatus.OK, "Đăng nhập thành công", authService.login(request));
    }

    @PostMapping("/api/register")
    public ResponseEntity<ApiResponse<LoginResponse>> register(@RequestBody AuthRequests.Register request, HttpServletRequest http) {
        rateLimiter.check("register:" + http.getRemoteAddr(), 10);
        return withCookie(HttpStatus.CREATED, "Đăng ký thành công", authService.register(request));
    }

    @GetMapping("/api/me")
    public ApiResponse<CurrentUserResponse> me() {
        AuthUser authUser = AccessGuard.currentUser();
        return ApiResponse.ok(userQueryService.currentUser(userQueryService.getById(authUser.id())));
    }

    @PostMapping("/api/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        authService.logout(AccessGuard.currentUser());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtService.forgetCookie().toString())
                .body(ApiResponse.message("Đã đăng xuất"));
    }

    /** Gia hạn phiên — dùng được cả khi token vừa hết hạn (trong thời gian cho phép). */
    @PostMapping("/api/refresh")
    public ResponseEntity<ApiResponse<Void>> refresh(HttpServletRequest http) {
        String token = authService.refresh(jwtFilter.resolveToken(http));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtService.cookie(token).toString())
                .body(ApiResponse.message("Đã gia hạn phiên"));
    }

    // ------------------------------------------------------------------ quên mật khẩu

    @PostMapping("/api/forgot-password")
    public Map<String, Object> forgot(@RequestBody AuthRequests.Forgot request, HttpServletRequest http) {
        rateLimiter.check("forgot:" + http.getRemoteAddr(), 12);
        requestValidator.validate(request).throwIfFailed();
        int ttl = passwordResetService.forgot(request.email().trim());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("message", "Nếu email tồn tại, chúng tôi đã gửi mã xác minh.");
        body.put("ttl", ttl);
        return body;
    }

    @PostMapping("/api/verify-reset-code")
    public ApiResponse<Void> verifyCode(@RequestBody AuthRequests.VerifyCode request, HttpServletRequest http) {
        rateLimiter.check("verify-code:" + http.getRemoteAddr(), 10);
        requestValidator.validate(request).throwIfFailed();
        passwordResetService.verify(request.email().trim(), request.code());
        return ApiResponse.message("Mã hợp lệ");
    }

    @PostMapping("/api/reset-password")
    public ApiResponse<Void> reset(@RequestBody AuthRequests.Reset request, HttpServletRequest http) {
        rateLimiter.check("reset:" + http.getRemoteAddr(), 10);
        Validator v = requestValidator.validate(request);
        if (!v.has("password") && !Objects.equals(request.password(), request.passwordConfirmation())) {
            v.add("password", "Xác nhận mật khẩu không khớp");
        }
        v.throwIfFailed();
        passwordResetService.reset(request.email().trim(), request.code(), request.password());
        return ApiResponse.message("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
    }

    // ------------------------------------------------------------------ xác thực email

    @GetMapping("/api/email/verify/{id}/{hash}")
    public ResponseEntity<Void> verifyEmail(@PathVariable Long id, @PathVariable String hash,
                                            @RequestParam(required = false) Long expires,
                                            @RequestParam(required = false) String signature) {
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(emailVerificationService.verify(id, hash, expires, signature)));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @PostMapping("/api/email/verification-notification")
    public ApiResponse<Void> resendVerification() {
        AuthUser authUser = AccessGuard.currentUser();
        rateLimiter.check("verify-email:" + authUser.id(), 6);
        User user = userQueryService.getById(authUser.id());
        if (user.getEmailVerifiedAt() != null) {
            return ApiResponse.message("Email đã được xác thực.");
        }
        emailVerificationService.send(user);
        return ApiResponse.message("Đã gửi lại email xác thực.");
    }

    private ResponseEntity<ApiResponse<LoginResponse>> withCookie(HttpStatus status, String message, LoginResponse result) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, jwtService.cookie(result.accessToken()).toString())
                .body(ApiResponse.ok(message, result));
    }
}
