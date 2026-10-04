package com.shoptech.modules.account.service;

import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.modules.account.dto.AccountRequests;
import com.shoptech.modules.auth.service.EmailVerificationService;
import com.shoptech.modules.user.dto.CurrentUserResponse;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import com.shoptech.modules.user.service.UserQueryService;
import com.shoptech.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Objects;
import java.util.Set;

/** Cài đặt tài khoản của người đang đăng nhập: hồ sơ, ảnh đại diện, mật khẩu, phiên đăng nhập. */
@Service
@RequiredArgsConstructor
public class AccountService {

    private static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024;
    private static final Set<String> AVATAR_EXT = Set.of("jpg", "jpeg", "png", "webp");

    private final UserRepository userRepository;
    private final UserQueryService userQueryService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CloudinaryService cloudinaryService;
    private final EmailVerificationService emailVerificationService;
    private final RequestValidator requestValidator;

    public record ProfileResult(CurrentUserResponse user, boolean emailChanged) {
    }

    /** Đổi email thì phải xác thực lại email mới. */
    @Transactional
    public ProfileResult updateProfile(Long userId, AccountRequests.UpdateProfile req) {
        User user = userQueryService.getById(userId);
        Validator v = requestValidator.validate(req);
        if (!v.has("username") && userRepository.existsByUsernameAndIdNot(req.username().trim(), userId)) {
            v.add("username", "Tên đăng nhập đã tồn tại");
        }
        if (!v.has("email") && userRepository.existsByEmailAndIdNot(req.email().trim(), userId)) {
            v.add("email", "Email đã tồn tại");
        }
        v.throwIfFailed();

        boolean emailChanged = !req.email().trim().equalsIgnoreCase(user.getEmail());
        user.setName(req.name().trim());
        user.setUsername(req.username().trim());
        user.setEmail(req.email().trim());
        user.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone().trim());
        if (emailChanged) {
            user.setEmailVerifiedAt(null);
        }
        userRepository.saveAndFlush(user);
        if (emailChanged) {
            emailVerificationService.send(user);
        }
        return new ProfileResult(userQueryService.currentUser(user), emailChanged);
    }

    /** Ảnh đại diện được lưu trên Cloudinary; cột avatar giữ URL đầy đủ. */
    @Transactional
    public CurrentUserResponse updateAvatar(Long userId, MultipartFile file) {
        User user = userQueryService.getById(userId);
        Validator v = new Validator();
        if (file == null || file.isEmpty()) {
            v.add("avatar", "Vui lòng chọn ảnh");
        } else if (file.getSize() > MAX_AVATAR_BYTES) {
            v.add("avatar", "Ảnh tối đa 2MB");
        } else {
            ImageRules.check(v, List.of(file), "avatar", false, AVATAR_EXT,
                    "Tệp phải là ảnh", "Chỉ chấp nhận JPG, PNG hoặc WEBP", "Ảnh tối đa 2MB");
        }
        v.throwIfFailed();

        user.setAvatar(cloudinaryService.uploadImage(file, "avatars"));
        userRepository.saveAndFlush(user);
        return userQueryService.currentUser(user);
    }

    /** Đổi mật khẩu: vô hiệu mọi phiên cũ và trả về token mới cho phiên hiện tại. */
    @Transactional
    public String changePassword(Long userId, AccountRequests.ChangePassword req) {
        User user = userQueryService.getById(userId);
        Validator v = requestValidator.validate(req);
        if (!v.has("password") && !Objects.equals(req.password(), req.passwordConfirmation())) {
            v.add("password", "Xác nhận mật khẩu không khớp");
        }
        if (!v.has("password") && Objects.equals(req.password(), req.currentPassword())) {
            v.add("password", "Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        v.throwIfFailed();
        if (user.getPassword() == null || !passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            throw ValidationException.of("current_password", "Mật khẩu hiện tại không đúng");
        }
        user.setPassword(passwordEncoder.encode(req.password()));
        return bumpTokenVersion(user);
    }

    /** Đăng xuất mọi thiết bị khác: tăng token_version, phiên hiện tại nhận token mới. */
    @Transactional
    public String logoutOthers(Long userId) {
        return bumpTokenVersion(userQueryService.getById(userId));
    }

    private String bumpTokenVersion(User user) {
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.saveAndFlush(user);
        return jwtService.issue(user.getId(), user.getTokenVersion());
    }
}
