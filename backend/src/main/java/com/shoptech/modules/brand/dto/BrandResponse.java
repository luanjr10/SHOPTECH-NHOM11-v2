package com.shoptech.modules.brand.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.shoptech.modules.brand.entity.Brand;

import java.time.Instant;
import java.util.List;

public record BrandResponse(
        Integer id,
        String name,
        String code,
        String slug,
        String logo,
        String description,
        Integer status,
        Instant createdAt,
        Instant updatedAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) List<String> images
) {

    public static BrandResponse of(Brand b) {
        return of(b, null);
    }

    public static BrandResponse of(Brand b, List<String> images) {
        return new BrandResponse(b.getId(), b.getName(), b.getCode(), b.getSlug(), b.getLogo(),
                b.getDescription(), b.getStatus(), b.getCreatedAt(), b.getUpdatedAt(), images);
    }
}
