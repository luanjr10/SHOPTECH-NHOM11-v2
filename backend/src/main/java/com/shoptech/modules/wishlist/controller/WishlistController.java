package com.shoptech.modules.wishlist.controller;

import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.wishlist.service.WishlistService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Danh sách sản phẩm yêu thích của khách, kèm mức giá mong muốn để nhận email khi giảm giá. */
@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> index() {
        return ApiResponse.ok(wishlistService.list(AccessGuard.currentUser().id()));
    }

    @GetMapping("/ids")
    public ApiResponse<List<Integer>> ids() {
        return ApiResponse.ok(wishlistService.ids(AccessGuard.currentUser().id()));
    }

    /** target_price được phép vắng mặt (khác với gửi null) nên nhận dạng Map để phân biệt. */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> store(@RequestBody Map<String, Object> body) {
        Validator v = new Validator();
        Integer productId = toInt(body.get("product_id"));
        v.check(productId != null, "product_id", "Vui lòng chọn sản phẩm");
        BigDecimal target = toPrice(body.get("target_price"), v);
        v.throwIfFailed();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã thêm vào danh sách yêu thích",
                wishlistService.add(AccessGuard.currentUser().id(), productId, body.containsKey("target_price"), target)));
    }

    @PatchMapping("/{productId}")
    public ApiResponse<Map<String, Object>> update(@PathVariable Integer productId, @RequestBody Map<String, Object> body) {
        Validator v = new Validator();
        BigDecimal target = toPrice(body.get("target_price"), v);
        v.throwIfFailed();
        return ApiResponse.ok("Đã cập nhật mức giá mong muốn",
                wishlistService.updateTarget(AccessGuard.currentUser().id(), productId, target));
    }

    @DeleteMapping("/{productId}")
    public ApiResponse<Void> destroy(@PathVariable Integer productId) {
        wishlistService.remove(AccessGuard.currentUser().id(), productId);
        return ApiResponse.message("Đã bỏ khỏi danh sách yêu thích");
    }

    private static Integer toInt(Object v) {
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return v == null ? null : Integer.parseInt(v.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static BigDecimal toPrice(Object v, Validator validator) {
        if (v == null || v.toString().isBlank()) {
            return null;
        }
        try {
            BigDecimal value = new BigDecimal(v.toString().trim());
            validator.check(value.signum() >= 0, "target_price", "Giá mong muốn không được nhỏ hơn 0");
            return value;
        } catch (NumberFormatException e) {
            validator.add("target_price", "Giá mong muốn không hợp lệ");
            return null;
        }
    }
}
