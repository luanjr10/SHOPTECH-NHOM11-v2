package com.shoptech.modules.commission.repository;

import com.shoptech.modules.commission.entity.CommissionSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommissionSettingRepository extends JpaRepository<CommissionSetting, Long> {

    List<CommissionSetting> findAllByOrderByScopeAsc();

    Optional<CommissionSetting> findFirstByScope(String scope);

    Optional<CommissionSetting> findFirstByScopeAndCategoryId(String scope, Integer categoryId);

    Optional<CommissionSetting> findFirstByScopeAndStoreId(String scope, Long storeId);
}
