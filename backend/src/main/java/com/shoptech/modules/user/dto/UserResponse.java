package com.shoptech.modules.user.dto;

import com.shoptech.config.AppProperties;
import com.shoptech.modules.user.entity.User;

import java.time.Instant;

/** Thông tin người dùng trả về client: ẩn password/remember_token/token_version, thêm avatar_url + has_password. */
public record UserResponse(
        Long id,
        String name,
        String username,
        String email,
        String phone,
        String googleId,
        String googleAvatar,
        String avatar,
        String role,
        Instant emailVerifiedAt,
        Instant createdAt,
        Instant updatedAt,
        String avatarUrl,
        boolean hasPassword
) {

    public static UserResponse of(User u, AppProperties props) {
        String avatarUrl = u.getAvatar() != null
                ? props.publicStorageUrl(u.getAvatar())
                : (u.getGoogleAvatar() == null || u.getGoogleAvatar().isBlank() ? null : u.getGoogleAvatar());
        return new UserResponse(
                u.getId(), u.getName(), u.getUsername(), u.getEmail(), u.getPhone(),
                u.getGoogleId(), u.getGoogleAvatar(), u.getAvatar(), u.getRole(),
                u.getEmailVerifiedAt(), u.getCreatedAt(), u.getUpdatedAt(),
                avatarUrl, u.getPassword() != null
        );
    }
}
