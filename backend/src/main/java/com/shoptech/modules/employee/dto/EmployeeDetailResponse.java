package com.shoptech.modules.employee.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.shoptech.modules.user.dto.UserResponse;
import com.shoptech.modules.user.entity.EmployeePermission;

import java.util.List;

public record EmployeeDetailResponse(
        @JsonUnwrapped UserResponse user,
        List<EmployeePermission> permissions,
        List<PermissionModuleView> permissionModules
) {
}
