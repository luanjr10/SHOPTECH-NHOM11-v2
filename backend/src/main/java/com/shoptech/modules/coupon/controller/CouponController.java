package com.shoptech.modules.coupon.controller;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.coupon.dto.CouponRequest;
import com.shoptech.modules.coupon.dto.CouponResponse;
import com.shoptech.modules.coupon.entity.Coupon;
import com.shoptech.modules.coupon.service.CouponService;
import com.shoptech.modules.customer.service.CustomerTiers;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    /** Danh sách voucher + danh sách hạng khách hàng (để chọn "chỉ áp dụng cho hạng..."). */
    public record CouponListResponse(@JsonUnwrapped ApiResponse<PagedResult<CouponResponse>> body,
                                     List<CustomerTiers.Tier> tiers) {
    }

    @GetMapping
    @PreAuthorize("@access.module('vouchers', 'view')")
    public CouponListResponse index(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return new CouponListResponse(ApiResponse.ok(couponService.list(search, page, perPage)), CustomerTiers.TIERS);
    }

    @PostMapping
    @PreAuthorize("@access.module('vouchers', 'create')")
    public ResponseEntity<ApiResponse<Coupon>> create(@RequestBody CouponRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã tạo voucher", couponService.create(request)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("@access.module('vouchers', 'edit')")
    public ApiResponse<Coupon> update(@PathVariable Long id, @RequestBody CouponRequest request) {
        return ApiResponse.ok("Đã cập nhật voucher", couponService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@access.module('vouchers', 'delete')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        couponService.delete(id);
        return ApiResponse.message("Đã xoá voucher");
    }
}
