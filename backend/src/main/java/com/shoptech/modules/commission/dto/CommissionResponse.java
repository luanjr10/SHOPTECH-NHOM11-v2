package com.shoptech.modules.commission.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.commission.entity.CommissionSetting;

/** Cấu hình hoa hồng kèm tên danh mục / gian hàng áp dụng. */
public record CommissionResponse(
        @JsonUnwrapped CommissionSetting setting,
        Ref category,
        StoreRef store
) {

    public record Ref(Integer id, String name) {
    }

    public record StoreRef(Long id, String name) {
    }
}
