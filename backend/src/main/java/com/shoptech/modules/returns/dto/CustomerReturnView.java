package com.shoptech.modules.returns.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.returns.entity.ReturnRequest;

/** Yêu cầu hoàn trả / bảo hành phía khách: kèm sản phẩm và gian hàng xử lý. */
public record CustomerReturnView(
        @JsonUnwrapped ReturnRequest request,
        OrderItem orderItem,
        SellerOrderRef sellerOrder
) {

    public record SellerOrderRef(Long id, String status, StoreRef store) {
    }

    public record StoreRef(Long id, String name, String slug) {
    }
}
