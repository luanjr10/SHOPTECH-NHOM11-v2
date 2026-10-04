package com.shoptech.security;

import com.shoptech.modules.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Lấy JWT từ header Authorization, nếu không có thì từ cookie HttpOnly "access_token"
 * và kiểm tra token_version (đổi mật khẩu / đăng xuất mọi thiết bị sẽ vô hiệu token cũ).
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String SESSION_EXPIRED_ATTR = "shoptech.sessionExpired";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = resolveToken(request);
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            jwtService.parse(token).ifPresent(claims -> authenticate(request, claims));
        }
        chain.doFilter(request, response);
    }

    private void authenticate(HttpServletRequest request, Claims claims) {
        long userId;
        try {
            userId = Long.parseLong(claims.getSubject());
        } catch (NumberFormatException e) {
            return;
        }
        userRepository.findById(userId).ifPresent(user -> {
            Number tv = claims.get("tv", Number.class);
            if (tv == null || tv.intValue() != user.getTokenVersion()) {
                // Đổi mật khẩu / đăng xuất mọi thiết bị đã tăng token_version.
                request.setAttribute(SESSION_EXPIRED_ATTR, true);
                return;
            }
            long exp = claims.getExpiration() == null ? 0 : claims.getExpiration().toInstant().getEpochSecond();
            AuthUser principal = new AuthUser(user.getId(), user.getRole(), claims.getId(), exp);
            var auth = new UsernamePasswordAuthenticationToken(principal, null, principal.authorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
        });
    }

    public String resolveToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ") && header.length() > 7) {
            return header.substring(7).trim();
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (jwtService.cookieName().equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
