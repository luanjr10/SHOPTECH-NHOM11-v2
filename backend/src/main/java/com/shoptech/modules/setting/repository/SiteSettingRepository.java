package com.shoptech.modules.setting.repository;

import com.shoptech.modules.setting.entity.SiteSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SiteSettingRepository extends JpaRepository<SiteSetting, Long> {

    Optional<SiteSetting> findByKey(String key);
}
