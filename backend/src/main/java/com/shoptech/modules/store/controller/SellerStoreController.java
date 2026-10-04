package com.shoptech.modules.store.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.seller.service.SellerContext;
import com.shoptech.modules.store.dto.PickupAddressRequest;
import com.shoptech.modules.store.dto.StoreForm;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.service.SellerStoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Seller Center — gian hàng của tôi. */
@RestController
@RequestMapping("/api/seller/stores")
@RequiredArgsConstructor
public class SellerStoreController {

    private final SellerContext seller;
    private final SellerStoreService storeService;

    @GetMapping
    @PreAuthorize("@seller.approved()")
    public ApiResponse<List<Store>> index() {
        return ApiResponse.ok(storeService.list(seller.profile()));
    }

    @PostMapping
    @PreAuthorize("@seller.approved()")
    public ResponseEntity<ApiResponse<Store>> create(
            @ModelAttribute StoreForm form,
            @RequestParam(required = false) MultipartFile logo) {
        Store store = storeService.create(seller.profile(), form, logo);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Đã tạo gian hàng, đang chờ admin duyệt", store));
    }

    @GetMapping("/{storeId}")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Store> show(@PathVariable Long storeId) {
        return ApiResponse.ok(seller.store(storeId));
    }

    /** Nhận PUT/PATCH/POST (multipart có logo gửi bằng POST). */
    @RequestMapping(value = "/{storeId}", method = {RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.POST})
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Store> update(
            @PathVariable Long storeId,
            @ModelAttribute StoreForm form,
            @RequestParam(required = false) MultipartFile logo) {
        return ApiResponse.ok("Cập nhật gian hàng thành công",
                storeService.update(seller.store(storeId), form, logo));
    }

    @PutMapping("/{storeId}/pickup-address")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Store> updatePickupAddress(@PathVariable Long storeId, @RequestBody PickupAddressRequest request) {
        return ApiResponse.ok("Đã cập nhật địa chỉ lấy hàng",
                storeService.updatePickupAddress(seller.store(storeId), request));
    }
}
