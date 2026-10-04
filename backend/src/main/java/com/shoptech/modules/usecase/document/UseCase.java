package com.shoptech.modules.usecase.document;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

/** MongoDB collection use_cases (Quick Link của danh mục) — tên trường camelCase. */
@Document("use_cases")
@Getter
@Setter
@NoArgsConstructor
public class UseCase {

    @Id
    private String id;

    private Integer categoryId;
    private String name;
    private String slug;
    private String image;
    private Integer sortOrder;
    private Boolean status;

    @Field("created_at")
    private Instant createdAt;

    @Field("updated_at")
    private Instant updatedAt;
}
