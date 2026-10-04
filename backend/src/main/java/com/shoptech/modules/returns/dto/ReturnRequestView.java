package com.shoptech.modules.returns.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.shoptech.modules.order.dto.SellerOrderView;
import com.shoptech.modules.returns.entity.ReturnRequest;
import com.shoptech.modules.user.dto.UserSummary;

import java.time.Instant;
import java.util.List;

/** Yêu cầu hoàn trả / bảo hành kèm sản phẩm, khách gửi và (khi xem chi tiết) phần đơn liên quan. */
public record ReturnRequestView(
        Long id,
        Long orderItemId,
        Long sellerOrderId,
        Long userId,
        String type,
        String reason,
        List<String> images,
        String status,
        String sellerResponse,
        Instant respondedAt,
        Instant createdAt,
        Instant updatedAt,
        ItemRef orderItem,
        UserSummary user,
        @JsonInclude(JsonInclude.Include.NON_NULL) SellerOrderView sellerOrder
) {

    public record ItemRef(Long id, Integer productId, String productName, String sku, Integer quantity) {
    }

    public static ReturnRequestView of(ReturnRequest r, ItemRef item, UserSummary user, SellerOrderView sellerOrder) {
        return new ReturnRequestView(r.getId(), r.getOrderItemId(), r.getSellerOrderId(), r.getUserId(), r.getType(),
                r.getReason(), r.getImages() == null ? List.of() : r.getImages(), r.getStatus(), r.getSellerResponse(),
                r.getRespondedAt(), r.getCreatedAt(), r.getUpdatedAt(), item, user, sellerOrder);
    }
}
