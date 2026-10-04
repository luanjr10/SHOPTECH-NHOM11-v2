package com.shoptech.modules.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.groups.Default;

import java.util.List;

/** Body JSON tạo/sửa danh mục (Jackson SNAKE_CASE: parent_id → parentId...). */
public record CategoryRequest(
        @NotBlank(message = "Vui lòng nhập mã danh mục", groups = OnCreate.class)
        @Size(max = 50, message = "Mã danh mục không được vượt quá 50 ký tự", groups = OnCreate.class)
        String code,

        @NotBlank(message = "Vui lòng nhập tên danh mục")
        @Size(max = 150, message = "Tên danh mục không được vượt quá 150 ký tự")
        String name,

        Integer parentId,

        @Size(max = 500, message = "Mô tả không được vượt quá 500 ký tự")
        String description,

        @Pattern(regexp = "icon|image", message = "Kiểu hiển thị không hợp lệ")
        String displayType,

        @Size(max = 150, message = "Tên icon không được vượt quá 150 ký tự")
        String icon,

        @Size(max = 150, message = "Màu icon không được vượt quá 150 ký tự")
        String color,

        @NotNull(message = "Vui lòng chọn trạng thái")
        @Pattern(regexp = "[01]", message = "Trạng thái không hợp lệ")
        String status,

        List<Integer> brandIds
) {

    public interface OnCreate extends Default {
    }
}
