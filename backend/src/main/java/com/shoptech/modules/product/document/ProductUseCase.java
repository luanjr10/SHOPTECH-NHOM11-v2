package com.shoptech.modules.product.document;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

/**
 * MongoDB product_use_cases — { productId, useCaseIds: ["<use_case _id>"...] }.
 * Một số bản ghi cũ lưu useCaseIds dạng chuỗi JSON; đọc qua {@code Json#listOf}, luôn ghi dạng mảng.
 */
@Document("product_use_cases")
@Getter
@Setter
@NoArgsConstructor
public class ProductUseCase {

    @Id
    private String id;

    private Integer productId;
    private Object useCaseIds;

    @Field("created_at")
    private Instant createdAt;

    @Field("updated_at")
    private Instant updatedAt;
}
