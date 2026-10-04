package com.shoptech.modules.highlight.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.highlight.service.HomeHighlightService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Dữ liệu công khai cho trang chủ client. Danh sách sản phẩm Flash sale / nổi bật lấy qua
 * GET /api/products?is_flash_sale=1 | is_featured=1; ở đây chỉ trả thời điểm kết thúc Flash sale.
 */
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class PublicHighlightController {

    private final HomeHighlightService highlightService;

    @GetMapping("/flash-sale")
    public ApiResponse<Map<String, String>> flashSale() {
        Map<String, String> data = new HashMap<>();
        data.put("ends_at", highlightService.flashSaleEndsAt());
        return ApiResponse.ok(data);
    }
}
