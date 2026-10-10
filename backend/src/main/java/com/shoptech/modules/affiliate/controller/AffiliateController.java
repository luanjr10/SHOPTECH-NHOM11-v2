package com.shoptech.modules.affiliate.controller;

import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PageMeta;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.affiliate.service.AffiliateService;
import com.shoptech.security.AccessGuard;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Affiliate phía khách: danh sách sản phẩm đang trả hoa hồng (công khai) và ví affiliate của tôi. */
@RestController
@RequestMapping("/api/affiliate")
@RequiredArgsConstructor
public class AffiliateController {

    private static final int PER_PAGE = 15;

    private final AffiliateService affiliateService;
    private final RequestValidator requestValidator;

    public record WithdrawalRequest(
            @NotNull(message = "Vui lòng chọn gian hàng") Long storeId,
            @NotNull(message = "Vui lòng nhập số tiền")
            @DecimalMin(value = "1", message = "Số tiền không hợp lệ") BigDecimal amount,
            @NotBlank(message = "Vui lòng nhập số điện thoại ví MoMo")
            @Pattern(regexp = "0\\d{9}", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0") String momoPhone,
            @NotBlank(message = "Vui lòng nhập tên chủ ví")
            @Size(max = 100, message = "Tên chủ ví không được vượt quá 100 ký tự") String accountHolder
    ) {
    }

    @GetMapping("/products")
    public ApiResponse<List<Map<String, Object>>> products(
            @RequestParam(required = false) String search,
            @RequestParam(name = "store_id", required = false) Long storeId,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        Page<Map<String, Object>> result = affiliateService.catalog(search, storeId, pageOf(page), sizeOf(perPage, 12, 48));
        return ApiResponse.page(result.getContent(), PageMeta.of(result));
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary() {
        Long userId = AccessGuard.currentUser().id();
        List<Map<String, Object>> stores = affiliateService.storesFor(userId);

        BigDecimal available = BigDecimal.ZERO;
        BigDecimal pending = BigDecimal.ZERO;
        BigDecimal withdrawing = BigDecimal.ZERO;
        BigDecimal withdrawn = BigDecimal.ZERO;
        BigDecimal earned = BigDecimal.ZERO;
        for (Map<String, Object> entry : stores) {
            @SuppressWarnings("unchecked")
            Map<String, Object> b = (Map<String, Object>) entry.get("balances");
            available = available.add((BigDecimal) b.get("available"));
            pending = pending.add((BigDecimal) b.get("pending"));
            withdrawing = withdrawing.add((BigDecimal) b.get("withdrawing"));
            withdrawn = withdrawn.add((BigDecimal) b.get("withdrawn"));
            earned = earned.add((BigDecimal) b.get("total_earned"));
        }
        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("available", available);
        totals.put("pending", pending);
        totals.put("withdrawing", withdrawing);
        totals.put("withdrawn", withdrawn);
        totals.put("total_earned", earned);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("referral_code", affiliateService.ensureReferralCode(userId));
        data.put("totals", totals);
        data.put("stores", stores);
        return ApiResponse.ok(data);
    }

    @GetMapping("/commissions")
    public ApiResponse<PagedResult<Map<String, Object>>> commissions(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(PagedResult.of(affiliateService.commissionsOf(AccessGuard.currentUser().id(),
                pageOf(page), sizeOf(perPage, PER_PAGE, 100))));
    }

    @GetMapping("/withdrawals")
    public ApiResponse<PagedResult<Map<String, Object>>> withdrawals(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(PagedResult.of(affiliateService.withdrawalsOf(AccessGuard.currentUser().id(),
                pageOf(page), sizeOf(perPage, PER_PAGE, 100))));
    }

    @PostMapping("/withdrawals")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestWithdrawal(@RequestBody WithdrawalRequest request) {
        requestValidator.validate(request).throwIfFailed();
        Map<String, Object> created = affiliateService.requestWithdrawal(AccessGuard.currentUser().id(), request.storeId(),
                request.amount(), request.momoPhone(), request.accountHolder().trim());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Đã gửi yêu cầu rút tiền tới gian hàng", created));
    }

    static int pageOf(Integer page) {
        return page == null || page < 1 ? 1 : page;
    }

    static int sizeOf(Integer perPage, int def, int max) {
        return perPage == null || perPage < 1 ? def : Math.min(perPage, max);
    }
}
