package com.shoptech.modules.highlight.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PageMeta;
import com.shoptech.modules.highlight.dto.HighlightProduct;
import com.shoptech.modules.highlight.service.HomeHighlightService;
import com.shoptech.modules.product.entity.Product;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/home-highlights")
@RequiredArgsConstructor
public class HomeHighlightController {

    private final HomeHighlightService highlightService;

    @GetMapping("/flash-sale")
    @PreAuthorize("@access.module('home_highlights', 'view')")
    public ApiResponse<Map<String, String>> flashSale() {
        Map<String, String> data = new HashMap<>();
        data.put("ends_at", highlightService.flashSaleEndsAt());
        return ApiResponse.ok(data);
    }

    @PutMapping("/flash-sale")
    @PreAuthorize("@access.module('home_highlights', 'edit')")
    public ApiResponse<Map<String, String>> updateFlashSale(@RequestBody(required = false) Map<String, String> body) {
        Map<String, String> data = new HashMap<>();
        data.put("ends_at", highlightService.updateFlashSale(body == null ? null : body.get("ends_at")));
        return ApiResponse.ok("Đã cập nhật thời gian kết thúc flash sale", data);
    }

    @GetMapping("/products")
    @PreAuthorize("@access.module('home_highlights', 'view')")
    public ApiResponse<List<HighlightProduct>> products(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String highlight,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        Page<HighlightProduct> result = highlightService.products(search, highlight, page, perPage);
        return ApiResponse.page(result.getContent(), PageMeta.of(result));
    }

    @PatchMapping("/products/{id}")
    @PreAuthorize("@access.module('home_highlights', 'edit')")
    public ApiResponse<Map<String, Object>> updateFlags(@PathVariable Integer id, @RequestBody(required = false) JsonNode body) {
        Product p = highlightService.updateFlags(id, flag(body, "is_featured"), flag(body, "is_flash_sale"));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", p.getId());
        data.put("is_featured", p.isFeatured());
        data.put("is_flash_sale", p.isFlashSale());
        return ApiResponse.ok("Đã cập nhật", data);
    }

    /** Nhận true/false, 1/0 hoặc "true"/"false"; không gửi thì trả null (giữ nguyên). */
    private static Boolean flag(JsonNode body, String field) {
        if (body == null || !body.has(field) || body.get(field).isNull()) {
            return null;
        }
        JsonNode v = body.get(field);
        if (v.isBoolean()) {
            return v.booleanValue();
        }
        String s = v.asText().trim();
        if (s.equals("1") || s.equalsIgnoreCase("true")) {
            return true;
        }
        if (s.equals("0") || s.equalsIgnoreCase("false")) {
            return false;
        }
        throw ValidationException.of(field, "Giá trị phải là true hoặc false");
    }
}
