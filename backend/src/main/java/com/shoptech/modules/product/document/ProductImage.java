package com.shoptech.modules.product.document;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.List;

/** MongoDB product_images — { productId, images: [url...] }. */
@Document("product_images")
@Getter
@Setter
@NoArgsConstructor
public class ProductImage {

    @Id
    private String id;

    private Integer productId;
    private List<String> images;

    @Field("created_at")
    private Instant createdAt;

    @Field("updated_at")
    private Instant updatedAt;
}
