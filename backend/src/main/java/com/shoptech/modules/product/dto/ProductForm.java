package com.shoptech.modules.product.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.groups.Default;
import org.springframework.web.bind.annotation.BindParam;

/**
 * Form multipart tạo/sửa sản phẩm. Các trường số nhận dạng chuỗi để trả đúng thông điệp lỗi
 * tiếng Việt thay vì lỗi ép kiểu; specifications/variants/use_case_ids/existing_images là chuỗi JSON.
 */
public record ProductForm(
        @NotBlank(message = "Vui lòng nhập mã sản phẩm", groups = OnCreate.class)
        @Size(max = 150, message = "Mã sản phẩm không được vượt quá 150 ký tự", groups = OnCreate.class)
        String code,

        @NotBlank(message = "Vui lòng nhập tên sản phẩm")
        @Size(max = 255, message = "Tên sản phẩm không được vượt quá 255 ký tự")
        String name,

        @NotBlank(message = "Vui lòng nhập giá sản phẩm")
        @Pattern(regexp = "-?\\d+(\\.\\d{1,2})?", message = "Giá sản phẩm không đúng định dạng số")
        String price,

        @BindParam("discount_percent")
        @Pattern(regexp = "-?\\d*", message = "Giảm giá phải là số nguyên")
        String discountPercent,

        @NotBlank(message = "Vui lòng nhập số lượng tồn kho")
        @Pattern(regexp = "-?\\d+", message = "Số lượng tồn kho phải là số nguyên")
        String stock,

        @NotBlank(message = "Vui lòng chọn trạng thái")
        @Pattern(regexp = "[01]", message = "Trạng thái không hợp lệ")
        String status,

        @BindParam("category_id")
        @NotBlank(message = "Vui lòng chọn danh mục")
        @Pattern(regexp = "\\d+", message = "Danh mục không hợp lệ")
        String categoryId,

        String specifications,

        String variants,

        @BindParam("use_case_ids") String useCaseIds,

        @BindParam("existing_images") String existingImages
) {

    public interface OnCreate extends Default {
    }
}
