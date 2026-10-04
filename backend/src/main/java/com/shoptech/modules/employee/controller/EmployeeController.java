package com.shoptech.modules.employee.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.employee.dto.EmployeeDetailResponse;
import com.shoptech.modules.employee.dto.EmployeeRequest;
import com.shoptech.modules.employee.dto.PermissionModuleView;
import com.shoptech.modules.employee.dto.PermissionUpdateRequest;
import com.shoptech.modules.employee.service.EmployeeService;
import com.shoptech.modules.user.dto.UserResponse;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import com.shoptech.security.AdminModules;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    /** Danh sách module để dựng ma trận quyền (admin + nhân viên đều xem được). */
    @GetMapping("/permission-modules")
    @PreAuthorize("@access.role('admin', 'employee')")
    public ApiResponse<List<AdminModules.Module>> modules() {
        return ApiResponse.ok(employeeService.modules());
    }

    @GetMapping("/employees")
    @PreAuthorize("@access.role('admin')")
    public ApiResponse<PagedResult<UserResponse>> index(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(employeeService.list(search, page, perPage));
    }

    @GetMapping("/employees/{id}")
    @PreAuthorize("@access.role('admin')")
    public ApiResponse<EmployeeDetailResponse> show(@PathVariable Long id) {
        return ApiResponse.ok(employeeService.detail(id));
    }

    @PostMapping("/employees")
    @PreAuthorize("@access.role('admin')")
    public ResponseEntity<ApiResponse<UserResponse>> create(@RequestBody EmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                "Đã tạo nhân viên — mật khẩu mặc định: password", employeeService.create(request)));
    }

    @PatchMapping("/employees/{id}")
    @PreAuthorize("@access.role('admin')")
    public ApiResponse<UserResponse> update(@PathVariable Long id, @RequestBody EmployeeRequest request) {
        return ApiResponse.ok("Đã cập nhật nhân viên", employeeService.update(id, request));
    }

    @DeleteMapping("/employees/{id}")
    @PreAuthorize("@access.role('admin')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        employeeService.delete(id, AccessGuard.currentUser().id());
        return ApiResponse.message("Đã xoá nhân viên");
    }

    @PutMapping("/employees/{id}/permissions")
    @PreAuthorize("@access.role('admin')")
    public ApiResponse<List<PermissionModuleView>> updatePermissions(@PathVariable Long id,
                                                                     @RequestBody PermissionUpdateRequest request) {
        return ApiResponse.ok("Đã cập nhật phân quyền", employeeService.updatePermissions(id, request));
    }
}
