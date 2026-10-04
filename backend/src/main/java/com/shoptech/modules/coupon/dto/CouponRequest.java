package com.shoptech.modules.coupon.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CouponRequest(
        @NotBlank(message = "Vui lòng nhập mã voucher")
        @Size(max = 50, message = "Mã voucher không được vượt quá 50 ký tự")
        String code,

        @Size(max = 255, message = "Tiêu đề không được vượt quá 255 ký tự")
        String title,

        @Size(max = 255, message = "Mô tả không được vượt quá 255 ký tự")
        String description,

        @NotBlank(message = "Vui lòng chọn loại voucher")
        @Pattern(regexp = "percent|fixed|free_ship", message = "Loại voucher không hợp lệ")
        String type,

        String targetTier,

        @DecimalMin(value = "0", message = "Giá trị không được nhỏ hơn 0")
        BigDecimal value,

        @DecimalMin(value = "0", message = "Giảm tối đa không được nhỏ hơn 0")
        BigDecimal maxDiscount,

        @DecimalMin(value = "0", message = "Đơn tối thiểu không được nhỏ hơn 0")
        BigDecimal minOrderAmount,

        @Min(value = 1, message = "Tổng lượt dùng tối thiểu là 1")
        Integer usageLimit,

        @Min(value = 1, message = "Lượt dùng mỗi khách tối thiểu là 1")
        Integer perUserLimit,

        String expiresAt,

        Boolean isActive
) {
}
