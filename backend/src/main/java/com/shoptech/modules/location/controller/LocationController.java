package com.shoptech.modules.location.controller;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.location.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Danh mục địa chỉ (GHN) — công khai, dùng cho form địa chỉ lấy hàng. */
@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping("/provinces")
    public ApiResponse<List<Map<String, Object>>> provinces() {
        return ApiResponse.ok(locationService.provinces());
    }

    @GetMapping("/provinces/{id}/districts")
    public ApiResponse<List<Map<String, Object>>> districts(@PathVariable long id) {
        if (locationService.findProvince(id) == null) {
            throw ApiException.notFound("Không tìm thấy tỉnh/thành phố");
        }
        return ApiResponse.ok(locationService.districtsOfProvince(id));
    }

    @GetMapping("/districts/{id}/wards")
    public ApiResponse<List<Map<String, Object>>> wards(@PathVariable long id) {
        return ApiResponse.ok(locationService.wardsOfDistrict(id));
    }
}
