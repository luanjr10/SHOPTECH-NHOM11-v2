package com.shoptech.modules.product.document;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

/**
 * MongoDB product_specifications — { productId, specifications, variants }.
 * <p>
 * Lưu ý dữ liệu: hai trường này phần lớn được lưu dưới dạng CHUỖI JSON
 * (vd. "[{\"name\":\"RAM\",\"value\":\"8GB\"}]"), có thể lẫn vài bản ghi là mảng thật.
 * Vì vậy khai báo Object và để {@code ProductService} giải mã/ghi lại đúng định dạng chuỗi JSON.
 */
@Document("product_specifications")
@Getter
@Setter
@NoArgsConstructor
public class ProductSpecification {

    @Id
    private String id;

    private Integer productId;
    private Object specifications;
    private Object variants;

    @Field("created_at")
    private Instant createdAt;

    @Field("updated_at")
    private Instant updatedAt;
}
