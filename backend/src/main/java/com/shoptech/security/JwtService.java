package com.shoptech.security;

import com.shoptech.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * JWT HS256 ký bằng JWT_SECRET: sub = id người dùng, claim "tv" = token_version.
 * Token được gửi qua cookie HttpOnly hoặc header Authorization.
 */
@Service
public class JwtService {

    private static final String ISSUER = "shoptech";

    private final AppProperties.Jwt config;
    private final SecretKey key;
    /** Blacklist token đã logout (jti → exp); đủ cho một instance monolith. */
    private final ConcurrentHashMap<String, Long> blacklist = new ConcurrentHashMap<>();

    public JwtService(AppProperties props) {
        this.config = props.jwt();
        this.key = new SecretKeySpec(config.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public String issue(long userId, int tokenVersion) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .notBefore(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofMinutes(config.ttlMinutes()))))
                .id(UUID.randomUUID().toString().replace("-", "").substring(0, 16))
                .claim("tv", tokenVersion)
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Optional<Claims> parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            if (claims.getId() != null && blacklist.containsKey(claims.getId())) {
                return Optional.empty();
            }
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /**
     * Dùng cho gia hạn phiên: chấp nhận token đã hết hạn (chữ ký vẫn phải hợp lệ) nếu chưa quá
     * khoảng refresh-ttl kể từ lúc phát hành.
     */
    public Optional<Claims> parseForRefresh(String token) {
        Claims claims;
        try {
            claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        } catch (ExpiredJwtException e) {
            claims = e.getClaims();
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
        if (claims.getId() != null && blacklist.containsKey(claims.getId())) {
            return Optional.empty();
        }
        Instant issuedAt = claims.getIssuedAt() == null ? Instant.EPOCH : claims.getIssuedAt().toInstant();
        if (issuedAt.plus(Duration.ofMinutes(config.refreshTtlMinutes())).isBefore(Instant.now())) {
            return Optional.empty();
        }
        return Optional.of(claims);
    }

    public void invalidate(String jti, long expEpochSeconds) {
        if (jti == null) {
            return;
        }
        long now = Instant.now().getEpochSecond();
        blacklist.entrySet().removeIf(e -> e.getValue() < now);
        blacklist.put(jti, expEpochSeconds);
    }

    public ResponseCookie cookie(String token) {
        return baseCookie(token).maxAge(Duration.ofMinutes(config.ttlMinutes())).build();
    }

    public ResponseCookie forgetCookie() {
        return baseCookie("").maxAge(0).build();
    }

    public String cookieName() {
        return config.cookieName();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from(config.cookieName(), value)
                .httpOnly(true)
                .secure(config.cookieSecure())
                .sameSite("Lax")
                .path("/");
    }

}
