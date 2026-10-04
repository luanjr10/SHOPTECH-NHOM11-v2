package com.shoptech.modules.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Địa chỉ lấy hàng (GHN) của gian hàng. */
public record PickupAddressRequest(
        @NotBlank(message = "Vui lòng nhập tên liên hệ lấy hàng")
        @Size(max = 150, message = "Tên liên hệ không được vượt quá 150 ký tự")
        String pickupContactName,

        @NotBlank(message = "Vui lòng nhập số điện thoại lấy hàng")
        @Pattern(regexp = "0\\d{9}", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")
        String pickupPhone,

        @NotNull(message = "Vui lòng chọn Tỉnh/Thành phố")
        Long provinceId,

        @NotNull(message = "Vui lòng chọn Quận/Huyện")
        Long districtId,

        @NotBlank(message = "Vui lòng chọn Phường/Xã")
        String wardCode,

        @NotBlank(message = "Vui lòng nhập số nhà, tên đường")
        @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
        String addressLine
) {
}
