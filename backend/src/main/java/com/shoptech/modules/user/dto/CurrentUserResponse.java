package com.shoptech.modules.user.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.user.entity.EmployeePermission;

import java.util.List;

/** Người dùng đang đăng nhập kèm danh sách quyền theo module — dùng cho /login và /me. */
public record CurrentUserResponse(
        @JsonUnwrapped UserResponse user,
        List<EmployeePermission> permissions
) {
}
