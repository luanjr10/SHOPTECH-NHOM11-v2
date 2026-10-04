package com.shoptech.modules.withdrawal.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.seller.entity.SellerWallet;
import com.shoptech.modules.seller.service.SellerContext;
import com.shoptech.modules.withdrawal.dto.CreateWithdrawalRequest;
import com.shoptech.modules.withdrawal.entity.WalletTransaction;
import com.shoptech.modules.withdrawal.entity.WithdrawalRequest;
import com.shoptech.modules.withdrawal.service.SellerWithdrawalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Seller Center — ví và rút tiền (theo hồ sơ người bán, không gắn gian hàng). */
@RestController
@RequestMapping("/api/seller")
@RequiredArgsConstructor
public class SellerWalletController {

    private final SellerContext seller;
    private final SellerWithdrawalService withdrawalService;

    @GetMapping("/wallet")
    @PreAuthorize("@seller.approved()")
    public ApiResponse<SellerWallet> wallet() {
        return ApiResponse.ok(withdrawalService.wallet(seller.profile()));
    }

    @GetMapping("/wallet/transactions")
    @PreAuthorize("@seller.approved()")
    public ApiResponse<PagedResult<WalletTransaction>> transactions(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(withdrawalService.transactions(seller.profile(), page, perPage));
    }

    @GetMapping("/withdrawals")
    @PreAuthorize("@seller.approved()")
    public ApiResponse<PagedResult<WithdrawalRequest>> withdrawals(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(withdrawalService.list(seller.profile(), page, perPage));
    }

    @PostMapping("/withdrawals")
    @PreAuthorize("@seller.approved()")
    public ResponseEntity<ApiResponse<WithdrawalRequest>> createWithdrawal(@RequestBody CreateWithdrawalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Đã gửi yêu cầu rút tiền", withdrawalService.create(seller.profile(), request)));
    }
}
