package com.shoptech.modules.xu.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.commission.service.CommissionService;
import com.shoptech.modules.xu.service.XuService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/** Trang Tài khoản → ShopTech Xu và bước dùng xu ở thanh toán. */
@RestController
@RequestMapping("/api/xu")
@RequiredArgsConstructor
public class XuController {

    private final XuService xuService;
    private final CommissionService commissionService;

    public record RedeemableRequest(BigDecimal subtotal, BigDecimal discountAmount, Boolean discountIsFreeShip,
                                    Boolean discountIsStoreFunded) {
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary() {
        return ApiResponse.ok(xuService.summary(AccessGuard.currentUser().id()));
    }

    @PostMapping("/checkin")
    public ApiResponse<Map<String, Object>> checkIn() {
        XuService.CheckInResult r = xuService.checkIn(AccessGuard.currentUser().id());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("xu", r.xu());
        data.put("streak", r.streak());
        data.put("bonus", r.bonus());
        data.put("summary", r.summary());
        String message = r.bonus()
                ? "Điểm danh thành công! Chuỗi " + r.streak() + " ngày, nhận " + r.xu() + " xu (đã gồm thưởng chuỗi)."
                : "Điểm danh thành công! Nhận " + r.xu() + " xu.";
        return ApiResponse.ok(message, data);
    }

    @GetMapping("/transactions")
    public ApiResponse<PagedResult<XuService.Transaction>> transactions(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        int size = perPage == null || perPage < 1 ? 20 : Math.min(perPage, 100);
        return ApiResponse.ok(PagedResult.of(xuService.transactions(AccessGuard.currentUser().id(),
                page == null || page < 1 ? 1 : page, size)));
    }

    /** Xem trước số xu tối đa dùng được cho giỏ hàng hiện tại (bước thanh toán). */
    @PostMapping("/redeemable")
    public ApiResponse<Map<String, Object>> redeemable(@RequestBody RedeemableRequest request) {
        Long userId = AccessGuard.currentUser().id();
        BigDecimal subtotal = request.subtotal() == null ? BigDecimal.ZERO : request.subtotal().max(BigDecimal.ZERO);
        BigDecimal discount = request.discountAmount() == null ? BigDecimal.ZERO : request.discountAmount().max(BigDecimal.ZERO);
        BigDecimal productDiscount = Boolean.TRUE.equals(request.discountIsFreeShip()) ? BigDecimal.ZERO : discount;
        BigDecimal platformDiscount = Boolean.TRUE.equals(request.discountIsStoreFunded()) ? BigDecimal.ZERO : discount;
        BigDecimal commission = commissionService.estimateTotal(commissionService.cartGroups(userId));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("balance", xuService.balance(userId));
        data.put("max_usable", xuService.maxRedeemable(userId, subtotal.subtract(productDiscount),
                commission.subtract(platformDiscount)));
        return ApiResponse.ok(data);
    }
}
