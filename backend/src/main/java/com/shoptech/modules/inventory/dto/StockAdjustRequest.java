package com.shoptech.modules.inventory.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StockAdjustRequest(
        @NotNull(message = "Vui lòng nhập số lượng thay đổi")
        Integer change,

        @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự")
        String reason
) {
}
