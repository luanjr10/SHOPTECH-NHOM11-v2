package com.shoptech.modules.inventory.dto;

import com.shoptech.modules.product.entity.Product;

/** Một dòng trong trang Kho hàng. */
public record InventoryItem(Integer id, String code, String name, Integer stock, boolean lowStock, Integer status) {

    public static InventoryItem of(Product p, int lowStockThreshold) {
        int stock = p.getStock() == null ? 0 : p.getStock();
        return new InventoryItem(p.getId(), p.getCode(), p.getName(), stock, stock <= lowStockThreshold, p.getStatus());
    }
}
