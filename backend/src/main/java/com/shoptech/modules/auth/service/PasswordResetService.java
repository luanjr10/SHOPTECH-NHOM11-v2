package com.shoptech.modules.auth.service;

import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.mail.MailService;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Quên mật khẩu bằng mã 6 số gửi qua email. Mã được lưu dạng băm (bcrypt) trong bảng
 * password_reset_tokens, hết hạn sau reset-code-ttl giây.
 */
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final AppProperties props;

    /** Luôn trả về thành công để không lộ email nào đã đăng ký. */
    @Transactional
    public int forgot(String email) {
        int ttl = props.auth().resetCodeTtlSeconds();
        userRepository.findByEmail(email).ifPresent(user -> {
            String code = String.format("%06d", RANDOM.nextInt(1_000_000));
            jdbc.update("DELETE FROM password_reset_tokens WHERE email = ?", email);
            jdbc.update("INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, ?)",
                    email, passwordEncoder.encode(code), Timestamp.from(Instant.now()));
            String duration = ttl >= 60 ? (ttl / 60) + " phút" : ttl + " giây";
            mailService.sendQuietly(email, "Mã đặt lại mật khẩu — ShopTech", "reset-code",
                    Map.of("name", user.getName() == null ? "" : user.getName(), "code", code, "duration", duration));
        });
        return ttl;
    }

    @Transactional
    public void verify(String email, String code) {
        String error = codeError(email, code);
        if (error != null) {
            throw ValidationException.of("code", error);
        }
    }

    /** Đặt mật khẩu mới, xoá mã và vô hiệu mọi phiên đăng nhập cũ. */
    @Transactional
    public void reset(String email, String code, String newPassword) {
        String error = codeError(email, code);
        if (error != null) {
            throw ValidationException.of("code", error);
        }
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setTokenVersion(user.getTokenVersion() + 1);
        jdbc.update("DELETE FROM password_reset_tokens WHERE email = ?", email);
    }

    private String codeError(String email, String code) {
        // UNIX_TIMESTAMP để tránh phụ thuộc kiểu dữ liệu/múi giờ mà driver trả về cho cột TIMESTAMP.
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT token, UNIX_TIMESTAMP(created_at) AS created_epoch FROM password_reset_tokens WHERE email = ?", email);
        if (rows.isEmpty() || !passwordEncoder.matches(code, String.valueOf(rows.get(0).get("token")))) {
            return "Mã xác minh không đúng";
        }
        Object epoch = rows.get(0).get("created_epoch");
        Instant created = epoch instanceof Number n ? Instant.ofEpochSecond(n.longValue()) : Instant.EPOCH;
        if (created.plusSeconds(props.auth().resetCodeTtlSeconds()).isBefore(Instant.now())) {
            jdbc.update("DELETE FROM password_reset_tokens WHERE email = ?", email);
            return "Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.";
        }
        if (userRepository.findByEmail(email).isEmpty()) {
            return "Không tìm thấy tài khoản với email này.";
        }
        return null;
    }
}
