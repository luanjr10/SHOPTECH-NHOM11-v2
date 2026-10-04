package com.shoptech.modules.category.dto;

import com.shoptech.modules.category.entity.Category;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * JSON của danh mục có hình dạng thay đổi theo query (with_brands, with_children, chi tiết...),
 * nên dựng bằng Map có thứ tự thay vì một record cố định (record không phân biệt được "không có key" với "key = null").
 */
public final class CategoryView {

    private CategoryView() {
    }

    public static Map<String, Object> base(Category c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("parent_id", c.getParentId());
        m.put("display_type", c.getDisplayType());
        m.put("code", c.getCode());
        m.put("name", c.getName());
        m.put("slug", c.getSlug());
        m.put("description", c.getDescription());
        m.put("icon", c.getIcon());
        m.put("color", c.getColor());
        m.put("status", c.getStatus());
        m.put("status_order", c.getStatusOrder());
        m.put("created_at", c.getCreatedAt());
        m.put("updated_at", c.getUpdatedAt());
        return m;
    }

    public static Map<String, Object> parentRef(Category parent) {
        if (parent == null) {
            return null;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", parent.getId());
        m.put("name", parent.getName());
        return m;
    }

    /** children:id,parent_id,name,slug,icon trong API chi tiết. */
    public static Map<String, Object> childRef(Category c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("parent_id", c.getParentId());
        m.put("name", c.getName());
        m.put("slug", c.getSlug());
        m.put("icon", c.getIcon());
        return m;
    }

    public static Map<String, Object> brandRef(Object[] row) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", ((Number) row[1]).intValue());
        m.put("code", row[2]);
        m.put("name", row[3]);
        m.put("logo", row[4]);
        return m;
    }
}
