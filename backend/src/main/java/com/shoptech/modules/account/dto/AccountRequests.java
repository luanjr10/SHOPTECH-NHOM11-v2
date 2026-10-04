package com.shoptech.modules.account.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AccountRequests {

    private AccountRequests() {
    }

    public record UpdateProfile(
            @NotBlank(message = "Vui lòng nhập họ tên")
            @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự")
            String name,

            @NotBlank(message = "Vui lòng nhập tên đăng nhập")
            @Size(max = 50, message = "Tên đăng nhập không được vượt quá 50 ký tự")
            @Pattern(regexp = "^[A-Za-z0-9_-]*$", message = "Tên đăng nhập chỉ gồm chữ, số, gạch ngang/dưới")
            String username,

            @NotBlank(message = "Vui lòng nhập email")
            @Email(message = "Email không hợp lệ")
            @Size(max = 190, message = "Email không được vượt quá 190 ký tự")
            String email,

            @Pattern(regexp = "^$|^0\\d{9}$", message = "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0.")
            String phone
    ) {
    }

    public record ChangePassword(
            @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại")
            String currentPassword,

            @NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
            String password,

            String passwordConfirmation
    ) {
    }
}
