package com.shoptech.modules.platformfund.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.platformfund.dto.PlatformFundOrder;
import com.shoptech.modules.platformfund.service.PlatformFundService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/platform-funds")
@RequiredArgsConstructor
public class PlatformFundController {

    private final PlatformFundService fundService;

    @GetMapping("/summary")
    @PreAuthorize("@access.module('platform_funds', 'view')")
    public ApiResponse<PlatformFundService.Summary> summary() {
        return ApiResponse.ok(fundService.summary());
    }

    @GetMapping("/held")
    @PreAuthorize("@access.module('platform_funds', 'view')")
    public ApiResponse<PagedResult<PlatformFundOrder>> held(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(fundService.held(page, perPage));
    }

    @GetMapping("/settlements")
    @PreAuthorize("@access.module('platform_funds', 'view')")
    public ApiResponse<PagedResult<PlatformFundOrder>> settlements(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(fundService.settlements(page, perPage));
    }
}
