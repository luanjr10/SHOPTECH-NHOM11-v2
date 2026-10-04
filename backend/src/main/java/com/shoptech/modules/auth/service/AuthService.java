package com.shoptech.modules.auth.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.modules.auth.dto.AuthRequests;
import com.shoptech.modules.auth.dto.LoginRequest;
import com.shoptech.modules.auth.dto.LoginResponse;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import com.shoptech.modules.user.service.UserQueryService;
import com.shoptech.security.AuthUser;
import com.shoptech.security.JwtService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserQueryService userQueryService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RequestValidator requestValidator;
    private final EmailVerificationService emailVerificationService;

    public LoginResponse login(LoginRequest request) {
        requestValidator.validate(request).throwIfFailed();

        String login = request.login().trim();
        User user = (login.contains("@") ? userRepository.findByEmail(login) : userRepository.findByUsername(login))
                .filter(u -> u.getPassword() != null && passwordEncoder.matches(request.password(), u.getPassword()))
                .orElseThrow(() -> ApiException.unauthorized("Thông tin đăng nhập không chính xác"));
        return issue(user);
    }

    /** Đăng ký tài khoản khách hàng, gửi email xác thực và đăng nhập luôn. */
    @Transactional
    public LoginResponse register(AuthRequests.Register req) {
        Validator v = requestValidator.validate(req);
        if (!v.has("username") && userRepository.existsByUsername(req.username().trim())) {
            v.add("username", "Tên đăng nhập đã tồn tại");
        }
        if (!v.has("email") && userRepository.existsByEmail(req.email().trim())) {
            v.add("email", "Email đã tồn tại");
        }
        if (!v.has("password") && !Objects.equals(req.password(), req.passwordConfirmation())) {
            v.add("password", "Xác nhận mật khẩu không khớp");
        }
        v.throwIfFailed();

        User user = new User();
        user.setName(req.name().trim());
        user.setUsername(req.username().trim());
        user.setEmail(req.email().trim());
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setRole(User.ROLE_CUSTOMER);
        userRepository.saveAndFlush(user);
        emailVerificationService.send(user);
        return issue(user);
    }

    /** Gia hạn phiên: token cũ (còn trong thời hạn refresh) bị vô hiệu, phát token mới. */
    @Transactional(readOnly = true)
    public String refresh(String token) {
        Claims claims = token == null ? null : jwtService.parseForRefresh(token).orElse(null);
        if (claims == null) {
            throw ApiException.unauthorized("Không thể gia hạn phiên. Vui lòng đăng nhập lại.");
        }
        User user;
        try {
            user = userRepository.findById(Long.parseLong(claims.getSubject())).orElse(null);
        } catch (NumberFormatException e) {
            user = null;
        }
        Number tv = claims.get("tv", Number.class);
        if (user == null || tv == null || tv.intValue() != user.getTokenVersion()) {
            throw ApiException.unauthorized("Không thể gia hạn phiên. Vui lòng đăng nhập lại.");
        }
        long exp = claims.getExpiration() == null ? 0 : claims.getExpiration().toInstant().getEpochSecond();
        jwtService.invalidate(claims.getId(), Math.max(exp, java.time.Instant.now().getEpochSecond() + 60));
        return jwtService.issue(user.getId(), user.getTokenVersion());
    }

    public void logout(AuthUser authUser) {
        jwtService.invalidate(authUser.jti(), authUser.expiresAtEpochSeconds());
    }

    public LoginResponse issue(User user) {
        String token = jwtService.issue(user.getId(), user.getTokenVersion());
        return new LoginResponse(userQueryService.currentUser(user), token, "Bearer");
    }
}
