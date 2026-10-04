package com.shoptech.modules.order.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.order.dto.PlaceOrderRequest;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.service.OrderPlacementService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/** Trang thanh toán: đặt hàng (COD / MoMo / VNPay / OnePay / SePay). */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class CheckoutController {

    private final OrderPlacementService placementService;

    public record PlacedOrder(Long id, String status, BigDecimal totalAmount, String paymentMethod) {
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlacedOrder>> place(@RequestBody PlaceOrderRequest request) {
        Order order = placementService.place(AccessGuard.currentUser().id(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đặt hàng thành công",
                new PlacedOrder(order.getId(), order.getStatus(), order.getTotalAmount(), order.getPaymentMethod())));
    }
}
