package com.shoptech.modules.order.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.order.dto.CustomerOrderView;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.service.CustomerOrderService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Đơn hàng của khách đang đăng nhập (trang Tài khoản → Đơn hàng). */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class CustomerOrderController {

    private final CustomerOrderService orderService;

    @GetMapping("/mine")
    public ApiResponse<PagedResult<CustomerOrderView>> mine(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(orderService.mine(userId(), page, perPage));
    }

    @GetMapping("/{id}")
    public ApiResponse<CustomerOrderView> show(@PathVariable Long id) {
        return ApiResponse.ok(orderService.detail(userId(), id));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<CustomerOrderView> cancel(@PathVariable Long id) {
        return ApiResponse.ok("Đã hủy đơn hàng", orderService.cancel(userId(), id));
    }

    @PostMapping("/{orderId}/seller-orders/{sellerOrderId}/complete")
    public ApiResponse<SellerOrder> complete(@PathVariable Long orderId, @PathVariable Long sellerOrderId) {
        return ApiResponse.ok("Đã xác nhận nhận hàng", orderService.completeSellerOrder(userId(), orderId, sellerOrderId));
    }

    private static Long userId() {
        return AccessGuard.currentUser().id();
    }
}
