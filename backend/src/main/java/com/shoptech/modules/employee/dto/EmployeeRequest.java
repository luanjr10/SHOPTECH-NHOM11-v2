package com.shoptech.modules.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record EmployeeRequest(
        @NotBlank(message = "Vui lòng nhập họ tên")
        @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự")
        String name,

        @NotBlank(message = "Vui lòng nhập tên đăng nhập")
        @Size(max = 50, message = "Tên đăng nhập không được vượt quá 50 ký tự")
        String username,

        @NotBlank(message = "Vui lòng nhập email")
        @Email(message = "Email không hợp lệ")
        @Size(max = 150, message = "Email không được vượt quá 150 ký tự")
        String email,

        @Pattern(regexp = "^$|^0\\d{9}$", message = "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0.")
        String phone
) {
}
