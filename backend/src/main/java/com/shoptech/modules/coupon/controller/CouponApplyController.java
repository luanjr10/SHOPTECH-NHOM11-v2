package com.shoptech.modules.coupon.controller;

import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.coupon.service.CouponApplyService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/** Bước thanh toán: kiểm tra mã giảm giá và tính trước số tiền được giảm. */
@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponApplyController {

    private final CouponApplyService couponApplyService;

    public record ApplyRequest(String code, BigDecimal subtotal, BigDecimal shippingFee) {
    }

    public record ApplyResult(String code, BigDecimal discountAmount, String discountTarget, boolean isFreeShip) {
    }

    @PostMapping("/apply")
    public ApiResponse<ApplyResult> apply(@RequestBody ApplyRequest request) {
        if (request.code() == null || request.code().isBlank() || request.code().length() > 50) {
            throw ValidationException.of("code", "Vui lòng nhập mã giảm giá");
        }
        if (request.subtotal() == null || request.subtotal().signum() < 0) {
            throw ValidationException.of("subtotal", "Tạm tính không hợp lệ");
        }
        BigDecimal shipping = request.shippingFee() == null ? BigDecimal.ZERO : request.shippingFee().max(BigDecimal.ZERO);
        CouponApplyService.Result r = couponApplyService.apply(request.code(), request.subtotal(),
                AccessGuard.currentUser().id(), shipping);
        return ApiResponse.ok(new ApplyResult(r.coupon().getCode(), r.discountAmount(), r.discountTarget(),
                r.coupon().isFreeShip()));
    }
}
