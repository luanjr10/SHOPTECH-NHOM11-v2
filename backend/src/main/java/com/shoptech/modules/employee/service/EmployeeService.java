package com.shoptech.modules.employee.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.employee.dto.EmployeeDetailResponse;
import com.shoptech.modules.employee.dto.EmployeeRequest;
import com.shoptech.modules.employee.dto.PermissionModuleView;
import com.shoptech.modules.employee.dto.PermissionUpdateRequest;
import com.shoptech.modules.user.dto.UserResponse;
import com.shoptech.modules.user.entity.EmployeePermission;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.EmployeePermissionRepository;
import com.shoptech.modules.user.repository.UserRepository;
import com.shoptech.security.AdminModules;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private static final int PER_PAGE = 15;
    /** Mật khẩu mặc định khi admin tạo nhân viên. */
    private static final String DEFAULT_PASSWORD = "password";

    private final UserRepository userRepository;
    private final EmployeePermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final RequestValidator requestValidator;
    private final AppProperties props;

    @Transactional(readOnly = true)
    public PagedResult<UserResponse> list(String search, Integer page, Integer perPage) {
        String term = search == null || search.isBlank() ? null : search.trim();
        var result = userRepository.searchByRole(User.ROLE_EMPLOYEE, term,
                        Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()))
                .map(u -> UserResponse.of(u, props));
        return PagedResult.of(result);
    }

    @Transactional(readOnly = true)
    public EmployeeDetailResponse detail(Long id) {
        User employee = findEmployee(id);
        return new EmployeeDetailResponse(UserResponse.of(employee, props),
                permissionRepository.findByUserId(id), mergedPermissions(id));
    }

    @Transactional
    public UserResponse create(EmployeeRequest req) {
        Validator v = requestValidator.validate(req);
        if (!v.has("username") && userRepository.existsByUsername(req.username().trim())) {
            v.add("username", "Tên đăng nhập đã được sử dụng");
        }
        if (!v.has("email") && userRepository.existsByEmail(req.email().trim())) {
            v.add("email", "Email đã được sử dụng");
        }
        v.throwIfFailed();

        User user = new User();
        apply(user, req);
        user.setRole(User.ROLE_EMPLOYEE);
        user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setEmailVerifiedAt(Instant.now());
        userRepository.save(user);
        return UserResponse.of(user, props);
    }

    @Transactional
    public UserResponse update(Long id, EmployeeRequest req) {
        User employee = findEmployee(id);
        Validator v = requestValidator.validate(req);
        if (!v.has("username") && userRepository.existsByUsernameAndIdNot(req.username().trim(), id)) {
            v.add("username", "Tên đăng nhập đã được sử dụng");
        }
        if (!v.has("email") && userRepository.existsByEmailAndIdNot(req.email().trim(), id)) {
            v.add("email", "Email đã được sử dụng");
        }
        v.throwIfFailed();

        apply(employee, req);
        userRepository.saveAndFlush(employee);
        return UserResponse.of(employee, props);
    }

    @Transactional
    public void delete(Long id, Long currentUserId) {
        User employee = findEmployee(id);
        if (employee.getId().equals(currentUserId)) {
            throw ValidationException.of("employee", "Không thể tự xoá chính mình.");
        }
        userRepository.delete(employee); // employee_permissions xoá theo FK cascade
    }

    public List<AdminModules.Module> modules() {
        return AdminModules.MODULES;
    }

    @Transactional
    public List<PermissionModuleView> updatePermissions(Long id, PermissionUpdateRequest req) {
        findEmployee(id);
        Validator v = new Validator();
        if (req == null || req.permissions() == null) {
            v.add("permissions", "Vui lòng gửi danh sách quyền");
            v.throwIfFailed();
        }
        List<PermissionUpdateRequest.Item> items = req.permissions();
        for (int i = 0; i < items.size(); i++) {
            String module = items.get(i) == null ? null : items.get(i).module();
            if (module == null || module.isBlank()) {
                v.add("permissions." + i + ".module", "Vui lòng chọn module");
            } else if (!AdminModules.isValidModule(module)) {
                v.add("permissions." + i + ".module", "Module không hợp lệ");
            }
        }
        v.throwIfFailed();

        for (PermissionUpdateRequest.Item item : items) {
            EmployeePermission p = permissionRepository.findByUserIdAndModule(id, item.module()).orElseGet(() -> {
                EmployeePermission np = new EmployeePermission();
                np.setUserId(id);
                np.setModule(item.module());
                return np;
            });
            p.setCanView(Boolean.TRUE.equals(item.canView()));
            p.setCanCreate(Boolean.TRUE.equals(item.canCreate()));
            p.setCanEdit(Boolean.TRUE.equals(item.canEdit()));
            p.setCanDelete(Boolean.TRUE.equals(item.canDelete()));
            permissionRepository.save(p);
        }
        permissionRepository.flush();
        return mergedPermissions(id);
    }

    private List<PermissionModuleView> mergedPermissions(Long userId) {
        Map<String, EmployeePermission> existing = permissionRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(EmployeePermission::getModule, Function.identity(), (a, b) -> a));
        return AdminModules.MODULES.stream().map(m -> {
            EmployeePermission p = existing.get(m.key());
            return new PermissionModuleView(m.key(), m.label(), m.abilities(),
                    p != null && p.isCanView(), p != null && p.isCanCreate(),
                    p != null && p.isCanEdit(), p != null && p.isCanDelete());
        }).toList();
    }

    private void apply(User user, EmployeeRequest req) {
        user.setName(req.name().trim());
        user.setUsername(req.username().trim());
        user.setEmail(req.email().trim());
        user.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone().trim());
    }

    private User findEmployee(Long id) {
        return userRepository.findById(id)
                .filter(u -> User.ROLE_EMPLOYEE.equals(u.getRole()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy nhân viên"));
    }
}
