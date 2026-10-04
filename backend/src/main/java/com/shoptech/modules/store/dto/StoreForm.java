package com.shoptech.modules.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Form tạo/sửa gian hàng của seller (multipart: name, description, logo). */
public record StoreForm(
        @NotBlank(message = "Vui lòng nhập tên gian hàng")
        @Size(max = 150, message = "Tên gian hàng không được vượt quá 150 ký tự")
        String name,

        @Size(max = 1000, message = "Mô tả không được vượt quá 1000 ký tự")
        String description
) {
}
