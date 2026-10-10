package com.shoptech.modules.compare.controller;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.ratelimit.RateLimiter;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.compare.service.ProductCompareService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** So sánh 2–3 sản phẩm (công khai): bảng thông số và lời tư vấn AI. */
@RestController
@RequestMapping("/api/compare")
@RequiredArgsConstructor
public class CompareController {

    private final ProductCompareService compareService;
    private final RateLimiter rateLimiter;

    @GetMapping
    public ApiResponse<Map<String, Object>> show(@RequestParam(required = false) String ids) {
        return ApiResponse.ok(compareService.compare(requireIds(ids)));
    }

    @GetMapping("/verdict")
    public ApiResponse<Map<String, Object>> verdict(@RequestParam(required = false) String ids, HttpServletRequest http) {
        rateLimiter.check("compare-verdict:" + http.getRemoteAddr(), 20);
        return ApiResponse.ok(compareService.verdict(requireIds(ids)));
    }

    private List<Integer> requireIds(String raw) {
        List<Integer> ids = compareService.normalizeIds(raw);
        if (ids.size() < ProductCompareService.MIN_PRODUCTS) {
            throw ApiException.unprocessable("Chọn ít nhất 2 sản phẩm để so sánh.");
        }
        return ids;
    }
}
