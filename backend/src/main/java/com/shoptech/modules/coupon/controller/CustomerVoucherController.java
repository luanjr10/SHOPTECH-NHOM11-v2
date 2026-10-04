package com.shoptech.modules.coupon.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.coupon.dto.MyVoucher;
import com.shoptech.modules.coupon.service.CustomerVoucherService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Trang Tài khoản → Hạng & Ưu đãi: voucher theo hạng thành viên của khách đang đăng nhập. */
@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class CustomerVoucherController {

    private final CustomerVoucherService voucherService;

    @GetMapping("/mine")
    public ApiResponse<List<MyVoucher>> mine() {
        return ApiResponse.ok(voucherService.mine(AccessGuard.currentUser().id()));
    }

    @PostMapping("/{id}/claim")
    public ApiResponse<Void> claim(@PathVariable Long id) {
        boolean created = voucherService.claim(AccessGuard.currentUser().id(), id);
        return ApiResponse.message(created ? "Đã nhận voucher — áp dụng ngay khi thanh toán." : "Bạn đã nhận voucher này rồi.");
    }
}
