package com.shoptech.modules.cart.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.cart.dto.CartSummary;
import com.shoptech.modules.cart.service.CartService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Giỏ hàng của người dùng đang đăng nhập. */
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    public record AddItemRequest(Integer productId, String sku, Integer quantity) {
    }

    public record UpdateItemRequest(Integer quantity) {
    }

    @GetMapping
    public ApiResponse<CartSummary> index() {
        return ApiResponse.ok(cartService.get(userId()));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartSummary>> add(@RequestBody AddItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã thêm sản phẩm vào giỏ hàng.",
                cartService.add(userId(), request.productId(), request.sku(), request.quantity())));
    }

    @PutMapping("/items/{id}")
    public ApiResponse<CartSummary> update(@PathVariable Long id, @RequestBody UpdateItemRequest request) {
        return ApiResponse.ok("Đã cập nhật số lượng.", cartService.update(userId(), id, request.quantity()));
    }

    @DeleteMapping("/items/{id}")
    public ApiResponse<CartSummary> remove(@PathVariable Long id) {
        return ApiResponse.ok("Đã xóa sản phẩm khỏi giỏ hàng.", cartService.remove(userId(), id));
    }

    @DeleteMapping
    public ApiResponse<CartSummary> clear() {
        return ApiResponse.ok("Đã xóa toàn bộ giỏ hàng.", cartService.clear(userId()));
    }

    private static Long userId() {
        return AccessGuard.currentUser().id();
    }
}
