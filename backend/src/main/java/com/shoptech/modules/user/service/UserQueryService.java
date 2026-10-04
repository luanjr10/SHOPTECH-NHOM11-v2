package com.shoptech.modules.user.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.user.dto.CurrentUserResponse;
import com.shoptech.modules.user.dto.UserResponse;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.EmployeePermissionRepository;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserQueryService {

    private final UserRepository userRepository;
    private final EmployeePermissionRepository permissionRepository;
    private final AppProperties props;

    public User getById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập"));
    }

    public CurrentUserResponse currentUser(User user) {
        return new CurrentUserResponse(UserResponse.of(user, props), permissionRepository.findByUserId(user.getId()));
    }
}
