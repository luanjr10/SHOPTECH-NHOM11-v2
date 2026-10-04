package com.shoptech.modules.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Đặt hàng từ trang thanh toán: danh sách sản phẩm + người nhận + địa chỉ GHN + phương thức thanh toán. */
public record PlaceOrderRequest(
        @NotEmpty(message = "Giỏ hàng trống")
        @Valid
        List<Item> items,

        @NotBlank(message = "Vui lòng nhập tên người nhận")
        @Size(max = 150, message = "Tên người nhận không được vượt quá 150 ký tự")
        String receiverName,

        @NotBlank(message = "Vui lòng nhập số điện thoại người nhận")
        @Pattern(regexp = "0\\d{9}", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")
        String receiverPhone,

        @NotBlank(message = "Vui lòng nhập địa chỉ giao hàng")
        @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
        String shippingAddress,

        @NotNull(message = "Vui lòng chọn Tỉnh/Thành phố")
        Long provinceId,

        @NotBlank(message = "Vui lòng chọn Tỉnh/Thành phố")
        @Size(max = 150)
        String provinceName,

        @NotNull(message = "Vui lòng chọn Quận/Huyện")
        Long districtId,

        @NotBlank(message = "Vui lòng chọn Quận/Huyện")
        @Size(max = 150)
        String districtName,

        @NotBlank(message = "Vui lòng chọn Phường/Xã")
        @Size(max = 20)
        String wardCode,

        @NotBlank(message = "Vui lòng chọn Phường/Xã")
        @Size(max = 150)
        String wardName,

        @NotBlank(message = "Vui lòng chọn phương thức thanh toán")
        @Pattern(regexp = "cod|momo|vnpay", message = "Phương thức thanh toán không hợp lệ")
        String paymentMethod,

        @Size(max = 50, message = "Mã giảm giá không hợp lệ")
        String couponCode
) {

    public record Item(
            @NotNull(message = "Sản phẩm không hợp lệ") Integer productId,
            String sku,
            @NotNull(message = "Số lượng không hợp lệ") @Min(value = 1, message = "Số lượng phải lớn hơn 0") Integer quantity
    ) {
    }
}
