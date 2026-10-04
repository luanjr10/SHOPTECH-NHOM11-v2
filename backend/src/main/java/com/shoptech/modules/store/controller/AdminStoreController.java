package com.shoptech.modules.store.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.store.dto.AdminStoreResponse;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.service.AdminStoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/stores")
@RequiredArgsConstructor
public class AdminStoreController {

    private final AdminStoreService storeService;

    @GetMapping
    @PreAuthorize("@access.module('stores', 'view')")
    public ApiResponse<PagedResult<AdminStoreResponse>> index(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(storeService.list(status, page, perPage));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("@access.module('stores', 'edit')")
    public ApiResponse<Store> updateStatus(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        return ApiResponse.ok("Cập nhật trạng thái gian hàng thành công",
                storeService.updateStatus(id, body == null ? null : body.get("status")));
    }
}
