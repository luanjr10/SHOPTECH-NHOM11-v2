package com.shoptech.modules.store.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.store.dto.PublicStoreDetail;
import com.shoptech.modules.store.dto.PublicStoreItem;
import com.shoptech.modules.store.service.PublicStoreService;
import com.shoptech.security.AccessGuard;
import com.shoptech.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Gian hàng công khai (client): GET không cần đăng nhập, theo dõi thì cần. */
@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class PublicStoreController {

    private final PublicStoreService storeService;

    @GetMapping
    public ApiResponse<List<PublicStoreItem>> index(
            @RequestParam(required = false) String search,
            @RequestParam(name = "province_id", required = false) Long provinceId,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        PublicStoreService.Listing result = storeService.list(search, provinceId, sort, page, perPage);
        return ApiResponse.page(result.stores(), result.meta());
    }

    @GetMapping("/{slug}")
    public ApiResponse<PublicStoreDetail> show(@PathVariable String slug) {
        AuthUser viewer = AccessGuard.currentUserOrNull();
        return ApiResponse.ok(storeService.detail(slug, viewer == null ? null : viewer.id()));
    }

    @PostMapping("/{slug}/follow")
    public ApiResponse<Map<String, Object>> toggleFollow(@PathVariable String slug) {
        Map<String, Object> result = storeService.toggleFollow(slug, AccessGuard.currentUser().id());
        return ApiResponse.ok(Boolean.TRUE.equals(result.get("following")) ? "Đã theo dõi gian hàng" : "Đã bỏ theo dõi",
                result);
    }
}
