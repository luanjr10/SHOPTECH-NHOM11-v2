package com.shoptech.modules.inventory.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PageMeta;
import com.shoptech.common.util.Numbers;
import com.shoptech.modules.inventory.dto.InventoryItem;
import com.shoptech.modules.inventory.dto.InventoryMeta;
import com.shoptech.modules.inventory.dto.StockAdjustRequest;
import com.shoptech.modules.inventory.entity.StockAdjustment;
import com.shoptech.modules.inventory.service.InventoryService;
import com.shoptech.modules.seller.service.SellerContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Seller Center — kho hàng. */
@RestController
@RequestMapping("/api/seller/stores/{storeId}")
@RequiredArgsConstructor
public class SellerInventoryController {

    private final SellerContext seller;
    private final InventoryService inventoryService;

    @GetMapping("/inventory")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<List<InventoryItem>> index(
            @PathVariable Long storeId,
            @RequestParam(name = "low_stock", required = false) String lowStock,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        Page<InventoryItem> result = inventoryService.list(seller.store(storeId), Numbers.toBool(lowStock), page, perPage);
        return ApiResponse.page(result.getContent(),
                InventoryMeta.of(PageMeta.of(result), InventoryService.LOW_STOCK_THRESHOLD));
    }

    @PostMapping("/products/{productId}/stock-adjustments")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<StockAdjustment> adjust(
            @PathVariable Long storeId,
            @PathVariable Integer productId,
            @RequestBody StockAdjustRequest request) {
        return ApiResponse.ok("Cập nhật tồn kho thành công",
                inventoryService.adjust(seller.store(storeId), productId, seller.profile().getId(), request));
    }

    @GetMapping("/products/{productId}/stock-adjustments")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<List<StockAdjustment>> history(@PathVariable Long storeId, @PathVariable Integer productId) {
        return ApiResponse.ok(inventoryService.history(seller.store(storeId), productId));
    }
}
