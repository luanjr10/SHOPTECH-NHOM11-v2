package com.shoptech.modules.coupon.controller;

import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.commission.service.CommissionService;
import com.shoptech.modules.coupon.service.CouponApplyService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Bước thanh toán: kiểm tra mã giảm giá và tính trước số tiền được giảm. */
@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponApplyController {

    private final CouponApplyService couponApplyService;
    private final CommissionService commissionService;

    public record ApplyRequest(String code, BigDecimal subtotal, BigDecimal shippingFee, String receiverPhone,
                               Map<Long, BigDecimal> storeShippingFees) {
    }

    public record ApplyResult(String code, BigDecimal discountAmount, String discountTarget, boolean isFreeShip,
                              boolean capped, boolean storeFunded, BigDecimal originalDiscount) {
    }

    @PostMapping("/apply")
    public ApiResponse<ApplyResult> apply(@RequestBody ApplyRequest request) {
        if (request.code() == null || request.code().isBlank() || request.code().length() > 50) {
            throw ValidationException.of("code", "Vui lòng nhập mã giảm giá");
        }
        if (request.subtotal() == null || request.subtotal().signum() < 0) {
            throw ValidationException.of("subtotal", "Tạm tính không hợp lệ");
        }
        Long userId = AccessGuard.currentUser().id();
        BigDecimal shipping = request.shippingFee() == null ? BigDecimal.ZERO : request.shippingFee().max(BigDecimal.ZERO);

        List<CommissionService.Group> groups = commissionService.cartGroups(userId);
        Map<Long, BigDecimal> storeSubtotals = new LinkedHashMap<>();
        groups.forEach(g -> storeSubtotals.put(g.storeId(), g.subtotal()));

        CouponApplyService.Result r = couponApplyService.apply(request.code(), request.subtotal(), userId, shipping,
                groups.isEmpty() ? null : commissionService.estimateTotal(groups), request.receiverPhone(),
                storeSubtotals, storeShippingFees(request.storeShippingFees(), storeSubtotals, shipping));
        return ApiResponse.ok(new ApplyResult(r.coupon().getCode(), r.discountAmount(), r.discountTarget(),
                r.coupon().isFreeShip(), r.capped(), r.coupon().getStoreId() != null, r.originalDiscount()));
    }

    /**
     * Phí ship theo từng gian hàng: ưu tiên số liệu client gửi từ báo giá vận chuyển; thiếu thì chia tổng phí ship
     * theo tỉ lệ giá trị hàng của từng gian hàng.
     */
    private static Map<Long, BigDecimal> storeShippingFees(Map<Long, BigDecimal> given, Map<Long, BigDecimal> subtotals,
                                                            BigDecimal totalShipping) {
        if (given != null && !given.isEmpty()) {
            return given;
        }
        BigDecimal total = subtotals.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<Long, BigDecimal> out = new LinkedHashMap<>();
        if (total.signum() <= 0) {
            return out;
        }
        subtotals.forEach((storeId, subtotal) ->
                out.put(storeId, totalShipping.multiply(subtotal).divide(total, 2, RoundingMode.HALF_UP)));
        return out;
    }
}
