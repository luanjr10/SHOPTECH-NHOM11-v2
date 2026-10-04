package com.shoptech.modules.category.document;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

/** MongoDB collection category_images — { categoryId, image }. */
@Document("category_images")
@Getter
@Setter
@NoArgsConstructor
public class CategoryImage {

    @Id
    private String id;

    private Integer categoryId;
    private String image;

    @Field("created_at")
    private Instant createdAt;

    @Field("updated_at")
    private Instant updatedAt;
}
