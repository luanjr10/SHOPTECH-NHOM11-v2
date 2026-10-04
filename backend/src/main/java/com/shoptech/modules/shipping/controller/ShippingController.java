package com.shoptech.modules.shipping.controller;

import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.shipping.service.ShippingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Ước tính phí vận chuyển ở bước thanh toán (công khai, không cần đăng nhập). */
@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class ShippingController {

    private final ShippingService shippingService;

    public record FeeRequest(Long districtId, String wardCode, Long provinceId, List<ShippingService.Line> items) {
    }

    @PostMapping("/fee")
    public ApiResponse<ShippingService.Quote> fee(@RequestBody FeeRequest request) {
        if (request.districtId() == null) {
            throw ValidationException.of("district_id", "Vui lòng chọn Quận/Huyện");
        }
        if (request.wardCode() == null || request.wardCode().isBlank()) {
            throw ValidationException.of("ward_code", "Vui lòng chọn Phường/Xã");
        }
        if (request.items() == null || request.items().isEmpty()
                || request.items().stream().anyMatch(i -> i.productId() == null || i.quantity() < 1)) {
            throw ValidationException.of("items", "Danh sách sản phẩm không hợp lệ");
        }
        return ApiResponse.ok(shippingService.quoteCart(request.items(), request.districtId(), request.wardCode(),
                request.provinceId()));
    }
}
