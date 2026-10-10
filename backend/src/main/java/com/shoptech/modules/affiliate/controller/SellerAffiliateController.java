package com.shoptech.modules.affiliate.controller;

import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PageMeta;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.affiliate.service.AffiliateService;
import com.shoptech.security.AccessGuard;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Seller Center — chương trình affiliate của gian hàng: bật/tắt, chọn sản phẩm + % hoa hồng, chi trả cho khách. */
@RestController
@RequestMapping("/api/seller/stores/{storeId}/affiliate")
@RequiredArgsConstructor
public class SellerAffiliateController {

    private final AffiliateService affiliateService;
    private final RequestValidator requestValidator;

    public record SettingsRequest(
            @NotNull(message = "Vui lòng chọn trạng thái") Boolean enabled,
            @NotNull(message = "Vui lòng nhập hoa hồng")
            @DecimalMin(value = "0", message = "Hoa hồng không hợp lệ")
            @DecimalMax(value = "50", message = "Hoa hồng tối đa 50%") BigDecimal rate,
            @NotNull(message = "Vui lòng nhập số ngày đối soát")
            @Min(value = 0, message = "Số ngày không hợp lệ") @Max(value = 90, message = "Tối đa 90 ngày") Integer holdDays,
            @NotNull(message = "Vui lòng nhập số tiền rút tối thiểu")
            @Min(value = 0, message = "Số tiền không hợp lệ") Integer minWithdrawal
    ) {
    }

    public record ProductsRequest(
            @NotEmpty(message = "Vui lòng chọn sản phẩm") @Size(max = 200, message = "Tối đa 200 sản phẩm mỗi lần") List<Integer> productIds,
            @NotNull(message = "Vui lòng chọn trạng thái") Boolean enabled,
            @DecimalMin(value = "0.1", message = "Hoa hồng tối thiểu 0.1%")
            @DecimalMax(value = "50", message = "Hoa hồng tối đa 50%") BigDecimal rate
    ) {
    }

    public record ReviewRequest(
            @NotNull(message = "Vui lòng chọn trạng thái") @Pattern(regexp = "approved|rejected", message = "Trạng thái không hợp lệ") String status,
            @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự") String note
    ) {
    }

    @GetMapping("/settings")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, Object>> settings(@PathVariable Long storeId) {
        return ApiResponse.ok(settingsMap(affiliateService.settingsFor(storeId)));
    }

    @PutMapping("/settings")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, Object>> updateSettings(@PathVariable Long storeId, @RequestBody SettingsRequest request) {
        requestValidator.validate(request).throwIfFailed();
        AffiliateService.Settings saved = affiliateService.updateSettings(storeId, request.enabled(), request.rate(),
                request.holdDays(), request.minWithdrawal());
        return ApiResponse.ok("Đã cập nhật chương trình affiliate của gian hàng", settingsMap(saved));
    }

    @GetMapping("/products")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<List<Map<String, Object>>> products(
            @PathVariable Long storeId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        Page<Map<String, Object>> result = affiliateService.sellerProducts(storeId, search,
                AffiliateController.pageOf(page), AffiliateController.sizeOf(perPage, 15, 100));
        return ApiResponse.page(result.getContent(), PageMeta.of(result));
    }

    @PutMapping("/products")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Void> updateProducts(@PathVariable Long storeId, @RequestBody ProductsRequest request) {
        var v = requestValidator.validate(request);
        v.check(!Boolean.TRUE.equals(request.enabled()) || request.rate() != null, "rate", "Vui lòng nhập hoa hồng");
        v.throwIfFailed();
        int count = affiliateService.setProductsAffiliate(storeId, request.productIds(), request.enabled(), request.rate());
        return ApiResponse.message(request.enabled() ? "Đã bật affiliate cho " + count + " sản phẩm"
                : "Đã tắt affiliate cho " + count + " sản phẩm");
    }

    @GetMapping("/commissions")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<PagedResult<Map<String, Object>>> commissions(
            @PathVariable Long storeId,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(PagedResult.of(affiliateService.commissionsOfStore(storeId,
                AffiliateController.pageOf(page), AffiliateController.sizeOf(perPage, 15, 100))));
    }

    @GetMapping("/withdrawals")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<PagedResult<Map<String, Object>>> withdrawals(
            @PathVariable Long storeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(PagedResult.of(affiliateService.withdrawalsOfStore(storeId, status,
                AffiliateController.pageOf(page), AffiliateController.sizeOf(perPage, 15, 100))));
    }

    @PostMapping("/withdrawals/{id}/review")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Void> review(@PathVariable Long storeId, @PathVariable Long id, @RequestBody ReviewRequest request) {
        requestValidator.validate(request).throwIfFailed();
        affiliateService.reviewWithdrawal(storeId, id, request.status(), AccessGuard.currentUser().id(), request.note());
        return ApiResponse.message("approved".equals(request.status()) ? "Đã ghi nhận chi trả" : "Đã từ chối yêu cầu rút tiền");
    }

    @PostMapping("/withdrawals/{id}/pay")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, String>> pay(@PathVariable Long storeId, @PathVariable Long id) {
        return ApiResponse.ok(Map.of("pay_url", affiliateService.createPayoutUrl(storeId, id, AccessGuard.currentUser().id())));
    }

    private static Map<String, Object> settingsMap(AffiliateService.Settings s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", s.enabled());
        m.put("rate", s.rate());
        m.put("hold_days", s.holdDays());
        m.put("min_withdrawal", s.minWithdrawal());
        return m;
    }
}
