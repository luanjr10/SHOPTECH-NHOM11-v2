package com.shoptech.modules.usecase.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.shoptech.modules.usecase.document.UseCase;

import java.time.Instant;

/** Document Mongo giữ key camelCase (categoryId, sortOrder) — frontend đọc đúng như vậy. */
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public record UseCaseResponse(
        String id,
        Integer categoryId,
        String name,
        String slug,
        String image,
        Integer sortOrder,
        Boolean status,
        @JsonProperty("created_at") Instant createdAt,
        @JsonProperty("updated_at") Instant updatedAt
) {

    public static UseCaseResponse of(UseCase u) {
        return new UseCaseResponse(u.getId(), u.getCategoryId(), u.getName(), u.getSlug(), u.getImage(),
                u.getSortOrder(), u.getStatus(), u.getCreatedAt(), u.getUpdatedAt());
    }
}
