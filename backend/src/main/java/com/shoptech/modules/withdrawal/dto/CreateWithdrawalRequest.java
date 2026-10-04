package com.shoptech.modules.withdrawal.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Seller gửi yêu cầu rút tiền từ số dư "có thể rút". */
public record CreateWithdrawalRequest(
        @NotNull(message = "Vui lòng nhập số tiền cần rút")
        @DecimalMin(value = "1", message = "Số tiền rút phải lớn hơn 0")
        @Digits(integer = 13, fraction = 2, message = "Số tiền rút không hợp lệ")
        BigDecimal amount,

        @NotBlank(message = "Vui lòng chọn phương thức nhận tiền")
        @Pattern(regexp = "cod|momo|vnpay|onepay|sepay", message = "Phương thức nhận tiền không hợp lệ")
        String method,

        @NotBlank(message = "Vui lòng nhập số tài khoản")
        @Size(max = 50, message = "Số tài khoản không được vượt quá 50 ký tự")
        String bankAccount,

        @NotBlank(message = "Vui lòng nhập tên ngân hàng / ví")
        @Size(max = 100, message = "Tên ngân hàng không được vượt quá 100 ký tự")
        String bankName,

        @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự")
        String note
) {
}
