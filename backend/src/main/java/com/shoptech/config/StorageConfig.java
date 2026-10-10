package com.shoptech.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

/**
 * Phục vụ file tĩnh đã lưu cục bộ (vd. ảnh đại diện cũ "avatars/xxx.jpg") tại /storage/**.
 * Ảnh tải lên mới được lưu trên Cloudinary nên không phụ thuộc thư mục này.
 */
@Configuration
public class StorageConfig implements WebMvcConfigurer {

    private final String storageDir;

    public StorageConfig(@Value("${app.storage-dir:storage}") String storageDir) {
        this.storageDir = storageDir;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(storageDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/storage/**").addResourceLocations(location);
    }
}
