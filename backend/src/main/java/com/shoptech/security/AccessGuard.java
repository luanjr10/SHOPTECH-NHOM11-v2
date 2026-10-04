package com.shoptech.security;

import com.shoptech.common.exception.ApiException;
import com.shoptech.modules.user.repository.EmployeePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Dùng trong @PreAuthorize: "@access.role('admin')", "@access.module('products','create')".
 * Ném ApiException 401/403 kèm thông điệp tiếng Việt khi không đủ quyền.
 */
@Component("access")
@RequiredArgsConstructor
public class AccessGuard {

    private final EmployeePermissionRepository permissionRepository;

    public static AuthUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthUser user)) {
            throw ApiException.unauthorized("Chưa đăng nhập");
        }
        return user;
    }

    /** Người dùng nếu request có JWT hợp lệ, null với khách vãng lai (route công khai). */
    public static AuthUser currentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AuthUser user ? user : null;
    }

    /** middleware role:a,b */
    public boolean role(String... roles) {
        AuthUser user = currentUser();
        if (Arrays.stream(roles).noneMatch(r -> r.equals(user.role()))) {
            throw ApiException.forbidden("Bạn không có quyền thực hiện thao tác này");
        }
        return true;
    }

    /** middleware role:admin,employee + permission:module,ability */
    public boolean module(String module, String ability) {
        role("admin", "employee");
        if (!AdminModules.isValidAbility(module, ability)) {
            throw new IllegalStateException("Cấu hình quyền không hợp lệ: " + module + "," + ability);
        }
        if (!hasModulePermission(currentUser(), module, ability)) {
            throw ApiException.forbidden("Bạn không có quyền truy cập mục này");
        }
        return true;
    }

    public boolean hasModulePermission(AuthUser user, String module, String ability) {
        if (user.isAdmin()) {
            return true;
        }
        if (!user.isEmployee()) {
            return false;
        }
        return permissionRepository.findByUserIdAndModule(user.id(), module)
                .map(p -> p.allows(ability))
                .orElse(false);
    }
}
