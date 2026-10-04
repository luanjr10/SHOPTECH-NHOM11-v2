package com.shoptech.modules.usecase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Form multipart Quick Link (ảnh gửi riêng qua trường "image"). */
public record UseCaseForm(
        @NotBlank(message = "Vui lòng nhập tên Quick Link")
        @Size(max = 150, message = "Tên Quick Link không được vượt quá 150 ký tự")
        String name,

        @Pattern(regexp = "\\d*", message = "Thứ tự phải là số nguyên")
        String sortOrder,

        @NotBlank(message = "Vui lòng chọn trạng thái")
        @Pattern(regexp = "[01]", message = "Trạng thái không hợp lệ")
        String status
) {
}
