package com.shoptech.modules.seller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Khách gửi đơn đăng ký mở gian hàng (trang "Đăng ký bán hàng"). */
public record SellerApplicationForm(
        @NotBlank(message = "Vui lòng nhập tên gian hàng dự kiến")
        @Size(max = 150, message = "Tên gian hàng không được vượt quá 150 ký tự")
        String shopName,

        @Pattern(regexp = "0\\d{9}", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")
        String phone,

        @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
        String address,

        @NotEmpty(message = "Vui lòng chọn ít nhất một danh mục kinh doanh")
        List<Integer> categoryIds
) {
}
