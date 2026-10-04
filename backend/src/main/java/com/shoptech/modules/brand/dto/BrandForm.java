package com.shoptech.modules.brand.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.groups.Default;
import org.springframework.web.bind.annotation.BindParam;

/** Form multipart tạo/sửa thương hiệu (ảnh gửi riêng qua images[]). */
public record BrandForm(
        @NotBlank(message = "Vui lòng nhập mã thương hiệu", groups = OnCreate.class)
        @Size(max = 150, message = "Mã thương hiệu không được vượt quá 150 ký tự", groups = OnCreate.class)
        String code,

        @NotBlank(message = "Vui lòng nhập tên thương hiệu")
        @Size(max = 150, message = "Tên thương hiệu không được vượt quá 150 ký tự")
        String name,

        @NotBlank(message = "Vui lòng nhập mô tả thương hiệu")
        @Size(max = 200, message = "Mô tả thương hiệu không được vượt quá 200 ký tự")
        String description,

        @NotBlank(message = "Vui lòng chọn trạng thái")
        @Pattern(regexp = "[01]", message = "Trạng thái không hợp lệ")
        String status,

        @BindParam("existing_images") String existingImages
) {

    public interface OnCreate extends Default {
    }
}
