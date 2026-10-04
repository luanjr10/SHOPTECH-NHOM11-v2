package com.shoptech.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Các body JSON của luồng đăng ký / quên mật khẩu. */
public final class AuthRequests {

    private AuthRequests() {
    }

    public record Register(
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

            @NotBlank(message = "Vui lòng nhập mật khẩu")
            @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
            String password,

            String passwordConfirmation
    ) {
    }

    public record Forgot(
            @NotBlank(message = "Vui lòng nhập email")
            @Email(message = "Email không hợp lệ")
            String email
    ) {
    }

    public record VerifyCode(
            @NotBlank(message = "Vui lòng nhập email")
            @Email(message = "Email không hợp lệ")
            String email,

            @NotBlank(message = "Vui lòng nhập mã xác minh")
            @Pattern(regexp = "^\\d{6}$", message = "Mã xác minh gồm 6 chữ số")
            String code
    ) {
    }

    public record Reset(
            @NotBlank(message = "Vui lòng nhập email")
            @Email(message = "Email không hợp lệ")
            String email,

            @NotBlank(message = "Vui lòng nhập mã xác minh")
            @Pattern(regexp = "^\\d{6}$", message = "Mã xác minh gồm 6 chữ số")
            String code,

            @NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
            String password,

            String passwordConfirmation
    ) {
    }
}
