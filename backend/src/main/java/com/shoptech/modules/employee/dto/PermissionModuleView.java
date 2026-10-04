package com.shoptech.modules.employee.dto;

import java.util.List;

/** Một dòng trong ma trận phân quyền: module + quyền hiện có của nhân viên. */
public record PermissionModuleView(
        String key,
        String label,
        List<String> abilities,
        boolean canView,
        boolean canCreate,
        boolean canEdit,
        boolean canDelete
) {
}
