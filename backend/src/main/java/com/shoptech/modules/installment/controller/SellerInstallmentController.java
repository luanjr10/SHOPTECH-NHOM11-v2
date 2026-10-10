package com.shoptech.modules.installment.controller;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.installment.service.InstallmentService;
import com.shoptech.modules.order.service.CustomerOrderService;
import com.shoptech.security.AccessGuard;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
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
import java.util.Objects;

/** Seller Center — bán trả góp: cấu hình điều kiện cho vay và quyết định từng yêu cầu của khách. */
@RestController
@RequestMapping("/api/seller/stores/{storeId}/installments")
@RequiredArgsConstructor
public class SellerInstallmentController {

    private final InstallmentService installmentService;
    private final CustomerOrderService customerOrderService;
    private final RequestValidator requestValidator;

    public record SettingsRequest(Boolean enabled, BigDecimal minOrder, List<TermRequest> terms) {
    }

    public record TermRequest(Integer months, BigDecimal monthlyRate) {
    }

    public record DecideRequest(
            @NotBlank(message = "Vui lòng chọn quyết định") @Pattern(regexp = "approve|reject", message = "Quyết định không hợp lệ") String decision,
            @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự") String note
    ) {
    }

    public record ListResponse(@JsonUnwrapped ApiResponse<PagedResult<Map<String, Object>>> body, Map<String, Object> stats) {
    }

    @GetMapping("/settings")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, Object>> settings(@PathVariable Long storeId) {
        return ApiResponse.ok(settingsMap(installmentService.settingsFor(storeId)));
    }

    @PutMapping("/settings")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, Object>> updateSettings(@PathVariable Long storeId, @RequestBody SettingsRequest request) {
        Validator v = new Validator();
        v.check(request.enabled() != null, "enabled", "Vui lòng chọn trạng thái");
        v.check(request.minOrder() != null && request.minOrder().signum() >= 0, "min_order", "Đơn tối thiểu không hợp lệ");
        List<TermRequest> terms = request.terms() == null ? List.of() : request.terms();
        v.check(!terms.isEmpty() && terms.size() <= InstallmentService.MAX_TERMS, "terms",
                "Cần từ 1 đến " + InstallmentService.MAX_TERMS + " kỳ hạn");
        for (int i = 0; i < terms.size(); i++) {
            TermRequest t = terms.get(i);
            v.check(t.months() != null && t.months() >= 2 && t.months() <= 36, "terms." + i + ".months", "Số tháng phải từ 2 đến 36");
            v.check(t.monthlyRate() != null && t.monthlyRate().signum() >= 0 && t.monthlyRate().compareTo(BigDecimal.valueOf(5)) <= 0,
                    "terms." + i + ".monthly_rate", "Lãi mỗi tháng phải từ 0 đến 5%");
        }
        v.check(terms.stream().map(TermRequest::months).filter(Objects::nonNull).distinct().count()
                == terms.stream().map(TermRequest::months).filter(Objects::nonNull).count(), "terms", "Các kỳ hạn không được trùng nhau");
        v.throwIfFailed();

        InstallmentService.Settings saved = installmentService.updateSettings(storeId, request.enabled(), request.minOrder(),
                terms.stream().map(t -> new InstallmentService.Term(t.months(), t.monthlyRate().doubleValue())).toList());
        return ApiResponse.ok("Đã cập nhật điều kiện bán trả góp", settingsMap(saved));
    }

    @GetMapping
    @PreAuthorize("@seller.owns(#storeId)")
    public ListResponse index(
            @PathVariable Long storeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String overdue,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        int size = perPage == null || perPage < 1 ? 15 : Math.min(perPage, 100);
        boolean overdueOnly = "1".equals(overdue) || "true".equalsIgnoreCase(overdue);
        return new ListResponse(ApiResponse.ok(PagedResult.of(installmentService.plansOfStore(storeId, status, overdueOnly,
                page == null || page < 1 ? 1 : page, size))), installmentService.storeStats(storeId));
    }

    @PostMapping("/{id}/decide")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, Object>> decide(@PathVariable Long storeId, @PathVariable Long id, @RequestBody DecideRequest request) {
        requestValidator.validate(request).throwIfFailed();
        if ("approve".equals(request.decision())) {
            installmentService.approve(storeId, id, request.note());
            return ApiResponse.ok("Đã chấp nhận cho vay trả góp. Khách sẽ thanh toán kỳ 1 để bắt đầu.", installmentService.detail(id));
        }
        Map<String, Object> plan = installmentService.reject(storeId, id, request.note());
        customerOrderService.cancel(((Number) plan.get("user_id")).longValue(), ((Number) plan.get("order_id")).longValue());
        installmentService.notifyDecision(id, false);
        return ApiResponse.ok("Đã từ chối và hủy đơn hàng của khách.", installmentService.detail(id));
    }

    private static Map<String, Object> settingsMap(InstallmentService.Settings s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", s.enabled());
        m.put("min_order", s.minOrder());
        m.put("options", s.options().stream().map(t -> {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("months", t.months());
            o.put("monthly_rate", t.monthlyRate());
            return o;
        }).toList());
        return m;
    }
}
