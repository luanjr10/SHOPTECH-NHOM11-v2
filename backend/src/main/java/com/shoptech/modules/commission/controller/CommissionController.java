package com.shoptech.modules.commission.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.commission.dto.CommissionRequest;
import com.shoptech.modules.commission.dto.CommissionResponse;
import com.shoptech.modules.commission.service.CommissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/commissions")
@RequiredArgsConstructor
public class CommissionController {

    private final CommissionService commissionService;

    @GetMapping
    @PreAuthorize("@access.module('commissions', 'view')")
    public ApiResponse<List<CommissionResponse>> index() {
        return ApiResponse.ok(commissionService.list());
    }

    @PostMapping
    @PreAuthorize("@access.module('commissions', 'create')")
    public ApiResponse<CommissionResponse> upsert(@RequestBody CommissionRequest request) {
        return ApiResponse.ok("Lưu cấu hình hoa hồng thành công", commissionService.upsert(request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@access.module('commissions', 'delete')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        commissionService.delete(id);
        return ApiResponse.message("Đã xóa cấu hình hoa hồng");
    }
}
