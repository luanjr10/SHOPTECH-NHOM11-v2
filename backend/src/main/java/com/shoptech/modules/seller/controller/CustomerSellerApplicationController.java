package com.shoptech.modules.seller.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.seller.dto.SellerApplicationForm;
import com.shoptech.modules.seller.entity.SellerApplication;
import com.shoptech.modules.seller.service.CustomerSellerApplicationService;
import com.shoptech.modules.user.service.UserQueryService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Trang client "Đăng ký bán hàng": gửi đơn và xem các đơn đã gửi. */
@RestController
@RequestMapping("/api/seller-applications")
@RequiredArgsConstructor
public class CustomerSellerApplicationController {

    private final CustomerSellerApplicationService applicationService;
    private final UserQueryService userQueryService;

    @PostMapping
    public ResponseEntity<ApiResponse<SellerApplication>> store(@RequestBody SellerApplicationForm form) {
        SellerApplication application = applicationService.submit(
                userQueryService.getById(AccessGuard.currentUser().id()), form);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã gửi đơn đăng ký người bán", application));
    }

    @GetMapping("/mine")
    public ApiResponse<List<SellerApplication>> mine() {
        return ApiResponse.ok(applicationService.mine(AccessGuard.currentUser().id()));
    }
}
