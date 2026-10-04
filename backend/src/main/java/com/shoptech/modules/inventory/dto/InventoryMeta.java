package com.shoptech.modules.inventory.dto;

import com.shoptech.common.response.PageMeta;

/** meta của danh sách tồn kho: phân trang + ngưỡng "sắp hết hàng". */
public record InventoryMeta(int currentPage, int lastPage, int perPage, long total, int lowStockThreshold) {

    public static InventoryMeta of(PageMeta page, int lowStockThreshold) {
        return new InventoryMeta(page.currentPage(), page.lastPage(), page.perPage(), page.total(), lowStockThreshold);
    }
}
