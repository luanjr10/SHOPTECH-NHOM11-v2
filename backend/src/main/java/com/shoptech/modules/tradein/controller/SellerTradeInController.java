package com.shoptech.modules.tradein.controller;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.tradein.service.TradeInService;
import com.shoptech.security.AccessGuard;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Seller Center — thu cũ đổi mới: bảng giá thu riêng của gian hàng và duyệt yêu cầu của khách. */
@RestController
@RequestMapping("/api/seller/stores/{storeId}/trade-in")
@RequiredArgsConstructor
public class SellerTradeInController {

    private final TradeInService tradeInService;
    private final RequestValidator requestValidator;

    public record ModelsResponse(@JsonUnwrapped ApiResponse<List<Map<String, Object>>> body, Map<String, String> categories) {
    }

    public record ModelRequest(
            @NotBlank(message = "Vui lòng chọn nhóm máy")
            @Pattern(regexp = "phone|laptop|tablet|watch|other", message = "Nhóm máy không hợp lệ") String category,
            @NotBlank(message = "Vui lòng nhập hãng") @Size(max = 60, message = "Hãng không được vượt quá 60 ký tự") String brand,
            @NotBlank(message = "Vui lòng nhập tên dòng máy") @Size(max = 150, message = "Tên không được vượt quá 150 ký tự") String name,
            @NotNull(message = "Vui lòng nhập giá thu gốc") @DecimalMin(value = "0", message = "Giá không hợp lệ") BigDecimal basePrice,
            Boolean isActive
    ) {
    }

    public record ReviewRequest(
            @NotBlank(message = "Vui lòng chọn trạng thái") @Pattern(regexp = "approved|rejected", message = "Trạng thái không hợp lệ") String status,
            @DecimalMin(value = "1", message = "Giá thu không hợp lệ") BigDecimal finalPrice,
            @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự") String note
    ) {
    }

    @GetMapping("/models")
    @PreAuthorize("@seller.owns(#storeId)")
    public ModelsResponse models(@PathVariable Long storeId) {
        return new ModelsResponse(ApiResponse.ok(tradeInService.models(storeId)), TradeInService.CATEGORIES);
    }

    @PostMapping("/models")
    @PreAuthorize("@seller.owns(#storeId)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createModel(@PathVariable Long storeId, @RequestBody ModelRequest request) {
        requestValidator.validate(request).throwIfFailed();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã thêm dòng máy",
                tradeInService.saveModel(storeId, null, request.category(), request.brand(), request.name(),
                        request.basePrice(), request.isActive() == null || request.isActive())));
    }

    @PatchMapping("/models/{id}")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, Object>> updateModel(@PathVariable Long storeId, @PathVariable Long id,
                                                         @RequestBody ModelRequest request) {
        requestValidator.validate(request).throwIfFailed();
        return ApiResponse.ok("Đã cập nhật dòng máy", tradeInService.saveModel(storeId, id, request.category(),
                request.brand(), request.name(), request.basePrice(), request.isActive() == null || request.isActive()));
    }

    @DeleteMapping("/models/{id}")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Void> deleteModel(@PathVariable Long storeId, @PathVariable Long id) {
        tradeInService.deleteModel(storeId, id);
        return ApiResponse.message("Đã xoá dòng máy");
    }

    @GetMapping("/requests")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<PagedResult<Map<String, Object>>> requests(
            @PathVariable Long storeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        int size = perPage == null || perPage < 1 ? 15 : Math.min(perPage, 100);
        return ApiResponse.ok(PagedResult.of(tradeInService.requests(storeId, status, page == null || page < 1 ? 1 : page, size)));
    }

    @PostMapping("/requests/{id}/review")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Map<String, Object>> review(@PathVariable Long storeId, @PathVariable Long id,
                                                    @RequestBody ReviewRequest request) {
        requestValidator.validate(request).throwIfFailed();
        Long reviewer = AccessGuard.currentUser().id();
        if ("approved".equals(request.status())) {
            return ApiResponse.ok("Đã duyệt và gửi voucher cho khách (khoản trừ do gian hàng chịu)",
                    tradeInService.approve(storeId, id, reviewer, request.finalPrice(), request.note()));
        }
        return ApiResponse.ok("Đã từ chối yêu cầu", tradeInService.reject(storeId, id, reviewer, request.note()));
    }
}
