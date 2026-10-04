package com.shoptech.modules.returns.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Người bán duyệt / từ chối yêu cầu hoàn trả kèm lời phản hồi cho khách. */
public record RespondReturnRequest(
        @NotBlank(message = "Vui lòng chọn duyệt hoặc từ chối")
        @Pattern(regexp = "approved|rejected", message = "Trạng thái không hợp lệ")
        String status,

        @NotBlank(message = "Vui lòng nhập phản hồi cho khách hàng")
        @Size(max = 1000, message = "Phản hồi không được vượt quá 1000 ký tự")
        String sellerResponse
) {
}
