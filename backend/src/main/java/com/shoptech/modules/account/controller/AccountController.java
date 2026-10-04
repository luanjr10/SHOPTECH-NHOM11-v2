package com.shoptech.modules.account.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.account.dto.AccountRequests;
import com.shoptech.modules.account.service.AccountService;
import com.shoptech.modules.user.dto.CurrentUserResponse;
import com.shoptech.security.AccessGuard;
import com.shoptech.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final JwtService jwtService;

    @PatchMapping("/profile")
    public ApiResponse<CurrentUserResponse> updateProfile(@RequestBody AccountRequests.UpdateProfile request) {
        var result = accountService.updateProfile(AccessGuard.currentUser().id(), request);
        String message = "Cập nhật hồ sơ thành công" + (result.emailChanged() ? ". Vui lòng xác thực email mới." : "");
        return ApiResponse.ok(message, result.user());
    }

    @PostMapping("/profile/avatar")
    public ApiResponse<CurrentUserResponse> updateAvatar(@RequestParam(required = false) MultipartFile avatar) {
        return ApiResponse.ok("Cập nhật ảnh đại diện thành công",
                accountService.updateAvatar(AccessGuard.currentUser().id(), avatar));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@RequestBody AccountRequests.ChangePassword request) {
        String token = accountService.changePassword(AccessGuard.currentUser().id(), request);
        return withNewSession(token, "Đổi mật khẩu thành công");
    }

    @PostMapping("/logout-others")
    public ResponseEntity<ApiResponse<Void>> logoutOthers() {
        String token = accountService.logoutOthers(AccessGuard.currentUser().id());
        return withNewSession(token, "Đã đăng xuất khỏi tất cả thiết bị khác");
    }

    private ResponseEntity<ApiResponse<Void>> withNewSession(String token, String message) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtService.cookie(token).toString())
                .body(ApiResponse.message(message));
    }
}
