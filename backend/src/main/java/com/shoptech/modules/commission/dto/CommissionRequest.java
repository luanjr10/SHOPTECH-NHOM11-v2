package com.shoptech.modules.commission.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record CommissionRequest(
        @NotBlank(message = "Vui lòng chọn phạm vi áp dụng")
        @Pattern(regexp = "default|category|store", message = "Phạm vi áp dụng không hợp lệ")
        String scope,

        Integer categoryId,

        Long storeId,

        @NotNull(message = "Vui lòng nhập tỉ lệ hoa hồng")
        @DecimalMin(value = "0", message = "Tỉ lệ hoa hồng không được nhỏ hơn 0%")
        @DecimalMax(value = "100", message = "Tỉ lệ hoa hồng không được vượt quá 100%")
        BigDecimal rate,

        Boolean isActive
) {
}
