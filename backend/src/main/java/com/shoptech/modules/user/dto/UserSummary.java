package com.shoptech.modules.user.dto;

import com.shoptech.config.AppProperties;
import com.shoptech.modules.user.entity.User;

/** Thông tin người dùng rút gọn khi hiển thị kèm đơn hàng, đánh giá, gian hàng... */
public record UserSummary(Long id, String name, String username, String email, String phone, String avatarUrl) {

    public static UserSummary of(User u, AppProperties props) {
        if (u == null) {
            return null;
        }
        return new UserSummary(u.getId(), u.getName(), u.getUsername(), u.getEmail(), u.getPhone(),
                UserResponse.of(u, props).avatarUrl());
    }
}
