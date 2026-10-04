package com.shoptech.modules.customer.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.customer.dto.AddressRequest;
import com.shoptech.modules.customer.entity.Address;
import com.shoptech.modules.customer.service.AddressService;
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

import java.util.List;

/** Sổ địa chỉ của người dùng đang đăng nhập (trang Tài khoản → Địa chỉ, và bước thanh toán). */
@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    public ApiResponse<List<Address>> index() {
        return ApiResponse.ok(addressService.list(AccessGuard.currentUser().id()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Address>> store(@RequestBody AddressRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã thêm địa chỉ",
                addressService.create(AccessGuard.currentUser().id(), request)));
    }

    @PatchMapping("/{id}")
    public ApiResponse<Address> update(@PathVariable Long id, @RequestBody AddressRequest request) {
        return ApiResponse.ok("Đã cập nhật địa chỉ", addressService.update(AccessGuard.currentUser().id(), id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> destroy(@PathVariable Long id) {
        addressService.delete(AccessGuard.currentUser().id(), id);
        return ApiResponse.message("Đã xoá địa chỉ");
    }

    @PostMapping("/{id}/default")
    public ApiResponse<Address> setDefault(@PathVariable Long id) {
        return ApiResponse.ok("Đã đặt làm địa chỉ mặc định", addressService.setDefault(AccessGuard.currentUser().id(), id));
    }
}
