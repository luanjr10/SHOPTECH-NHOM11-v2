package com.shoptech.modules.user.repository;

import com.shoptech.modules.user.entity.EmployeePermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeePermissionRepository extends JpaRepository<EmployeePermission, Long> {

    List<EmployeePermission> findByUserId(Long userId);

    Optional<EmployeePermission> findByUserIdAndModule(Long userId, String module);

    void deleteByUserId(Long userId);
}
