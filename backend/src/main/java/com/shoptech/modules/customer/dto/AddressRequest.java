package com.shoptech.modules.customer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.groups.Default;

/**
 * Thêm / sửa địa chỉ nhận hàng. Khi thêm mới (OnCreate) mọi trường bắt buộc;
 * khi sửa chỉ kiểm tra những trường được gửi lên (giống "sometimes" của Laravel).
 */
public record AddressRequest(
        @NotBlank(message = "Vui lòng nhập tên người nhận", groups = OnCreate.class)
        @Size(max = 150, message = "Tên người nhận không được vượt quá 150 ký tự")
        String recipientName,

        @NotBlank(message = "Vui lòng nhập số điện thoại", groups = OnCreate.class)
        @Pattern(regexp = "0\\d{9}", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")
        String phone,

        @NotNull(message = "Vui lòng chọn Tỉnh/Thành phố", groups = OnCreate.class)
        Long provinceId,

        @NotNull(message = "Vui lòng chọn Quận/Huyện", groups = OnCreate.class)
        Long districtId,

        @NotBlank(message = "Vui lòng chọn Phường/Xã", groups = OnCreate.class)
        String wardCode,

        @NotBlank(message = "Vui lòng nhập số nhà, tên đường", groups = OnCreate.class)
        @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
        String addressLine,

        Boolean isDefault
) {

    public interface OnCreate extends Default {
    }
}
