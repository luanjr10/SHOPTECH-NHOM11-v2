package com.shoptech.modules.auth.service;

import com.shoptech.common.mail.MailService;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;

/**
 * Xác thực email bằng liên kết có chữ ký HMAC và thời hạn:
 * /api/email/verify/{id}/{sha1(email)}?expires=...&signature=...
 */
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Set<String> STAFF_ROLES = Set.of(User.ROLE_ADMIN, User.ROLE_EMPLOYEE);

    private final UserRepository userRepository;
    private final MailService mailService;
    private final AppProperties props;

    public void send(User user) {
        int minutes = props.auth().verifyEmailTtlMinutes();
        long expires = Instant.now().plusSeconds(minutes * 60L).getEpochSecond();
        String hash = sha1(user.getEmail());
        String url = props.backendUrl("/api/email/verify/" + user.getId() + "/" + hash
                + "?expires=" + expires + "&signature=" + sign(user.getId(), hash, expires));
        mailService.sendQuietly(user.getEmail(), "Xác thực địa chỉ email — ShopTech", "verify-email",
                Map.of("name", user.getName() == null ? "" : user.getName(), "url", url, "minutes", minutes));
    }

    /** @return URL trang frontend để chuyển người dùng tới (kèm ?verified=1 hoặc ?verified=invalid). */
    @Transactional
    public String verify(Long id, String hash, Long expires, String signature) {
        User user = userRepository.findById(id).orElse(null);
        boolean valid = user != null
                && expires != null && expires >= Instant.now().getEpochSecond()
                && MessageDigest.isEqual(sha1(user.getEmail()).getBytes(StandardCharsets.UTF_8),
                String.valueOf(hash).getBytes(StandardCharsets.UTF_8))
                && signature != null
                && MessageDigest.isEqual(sign(id, hash, expires).getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8));
        if (!valid) {
            return target(user) + "?verified=invalid";
        }
        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(Instant.now());
        }
        return target(user) + "?verified=1";
    }

    private String target(User user) {
        if (user != null && STAFF_ROLES.contains(user.getRole())) {
            return props.adminUrl().replaceAll("/+$", "") + "/settings";
        }
        return props.frontendUrl().replaceAll("/+$", "") + "/tai-khoan";
    }

    private String sign(Long id, String hash, long expires) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(props.jwt().secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] out = mac.doFinal(("verify-email|" + id + "|" + hash + "|" + expires).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(out);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String sha1(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1")
                    .digest(String.valueOf(value).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
