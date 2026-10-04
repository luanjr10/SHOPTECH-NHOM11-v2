package com.shoptech.modules.customer.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.customer.dto.CustomerDetail;
import com.shoptech.modules.customer.dto.CustomerRow;
import com.shoptech.modules.customer.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @PreAuthorize("@access.module('customers', 'view')")
    public ApiResponse<PagedResult<CustomerRow>> index(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(customerService.list(search, tier, page, perPage));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@access.module('customers', 'view')")
    public ApiResponse<CustomerDetail> show(@PathVariable Long id) {
        return ApiResponse.ok(customerService.detail(id));
    }
}
