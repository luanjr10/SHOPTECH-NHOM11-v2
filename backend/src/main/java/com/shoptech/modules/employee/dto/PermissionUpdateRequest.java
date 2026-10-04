package com.shoptech.modules.employee.dto;

import java.util.List;

public record PermissionUpdateRequest(List<Item> permissions) {

    public record Item(String module, Boolean canView, Boolean canCreate, Boolean canEdit, Boolean canDelete) {
    }
}
