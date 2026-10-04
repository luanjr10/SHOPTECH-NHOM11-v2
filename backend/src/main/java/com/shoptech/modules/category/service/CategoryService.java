package com.shoptech.modules.category.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.Pagination;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.common.util.Slugs;
import com.shoptech.modules.brand.repository.BrandRepository;
import com.shoptech.modules.category.document.CategoryImage;
import com.shoptech.modules.category.dto.CategoryRequest;
import com.shoptech.modules.category.dto.CategoryView;
import com.shoptech.modules.category.entity.Category;
import com.shoptech.modules.category.repository.CategoryImageRepository;
import com.shoptech.modules.category.repository.CategoryRepository;
import com.shoptech.modules.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private static final int PER_PAGE = 6;

    private final CategoryRepository categoryRepository;
    private final CategoryImageRepository categoryImageRepository;
    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final CloudinaryService cloudinaryService;
    private final RequestValidator requestValidator;

    public record ListQuery(String search, String sort, String parentId, boolean withBrands, boolean withChildren,
                            Integer page, Integer perPage) {
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> list(ListQuery q) {
        Sort order = switch (q.sort() == null ? "" : q.sort()) {
            case "name_asc" -> Sort.by("name").ascending();
            case "name_desc" -> Sort.by("name").descending();
            default -> Sort.by("createdAt").descending();
        };
        boolean filterParent = q.parentId() != null;
        Integer parentId = null;
        if (filterParent && !Set.of("null", "top_level", "0").contains(q.parentId())) {
            try {
                parentId = (int) Double.parseDouble(q.parentId());
            } catch (NumberFormatException e) {
                parentId = 0; // giá trị không hợp lệ → không khớp danh mục nào
            }
        }
        String search = q.search() == null || q.search().isBlank() ? null : q.search().trim();

        Page<Category> page = categoryRepository.search(search, filterParent, parentId,
                Pagination.of(q.page(), q.perPage(), PER_PAGE, order));
        List<Category> items = page.getContent();
        List<Integer> ids = items.stream().map(Category::getId).toList();

        Map<Integer, Long> productCounts = toCountMap(ids.isEmpty() ? List.of() : productRepository.countByCategory(ids));
        Map<Integer, Long> childCounts = toCountMap(ids.isEmpty() ? List.of() : categoryRepository.countChildren(ids));
        Map<Integer, Category> parents = categoryRepository.findAllById(items.stream()
                        .map(Category::getParentId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Category::getId, c -> c));

        Map<Integer, List<Map<String, Object>>> brandsByCategory = new HashMap<>();
        if (q.withBrands() && !ids.isEmpty()) {
            for (Object[] row : categoryRepository.findBrandsOfCategories(ids)) {
                brandsByCategory.computeIfAbsent(((Number) row[0]).intValue(), k -> new ArrayList<>())
                        .add(CategoryView.brandRef(row));
            }
        }

        // with_children: 2 cấp con đang hoạt động, sắp theo status_order.
        Map<Integer, List<Category>> level1 = new HashMap<>();
        Map<Integer, List<Category>> level2 = new HashMap<>();
        Map<Integer, Long> nestedChildCounts = new HashMap<>();
        if (q.withChildren() && !ids.isEmpty()) {
            List<Category> l1 = categoryRepository.findByParentIdInAndStatusOrderByStatusOrderAsc(ids, 1);
            l1.forEach(c -> level1.computeIfAbsent(c.getParentId(), k -> new ArrayList<>()).add(c));
            List<Integer> l1Ids = l1.stream().map(Category::getId).toList();
            if (!l1Ids.isEmpty()) {
                List<Category> l2 = categoryRepository.findByParentIdInAndStatusOrderByStatusOrderAsc(l1Ids, 1);
                l2.forEach(c -> level2.computeIfAbsent(c.getParentId(), k -> new ArrayList<>()).add(c));
                List<Integer> nestedIds = new ArrayList<>(l1Ids);
                l2.forEach(c -> nestedIds.add(c.getId()));
                nestedChildCounts = toCountMap(categoryRepository.countChildren(nestedIds));
            }
        }

        Set<Integer> imageIds = new HashSet<>(ids);
        level1.values().forEach(list -> list.forEach(c -> imageIds.add(c.getId())));
        level2.values().forEach(list -> list.forEach(c -> imageIds.add(c.getId())));
        Map<Integer, String> images = imagesOf(imageIds);

        Map<Integer, Long> finalNestedCounts = nestedChildCounts;
        return page.map(c -> {
            Map<String, Object> m = CategoryView.base(c);
            m.put("products_count", productCounts.getOrDefault(c.getId(), 0L));
            m.put("children_count", childCounts.getOrDefault(c.getId(), 0L));
            m.put("parent", CategoryView.parentRef(parents.get(c.getParentId())));
            if (q.withBrands()) {
                m.put("brands", brandsByCategory.getOrDefault(c.getId(), List.of()));
            }
            m.put("image", images.get(c.getId()));
            if (q.withChildren()) {
                m.put("children", level1.getOrDefault(c.getId(), List.of()).stream().map(child -> {
                    Map<String, Object> cm = CategoryView.base(child);
                    cm.put("children_count", finalNestedCounts.getOrDefault(child.getId(), 0L));
                    cm.put("image", images.get(child.getId()));
                    cm.put("children", level2.getOrDefault(child.getId(), List.of()).stream().map(grand -> {
                        Map<String, Object> gm = CategoryView.base(grand);
                        gm.put("children_count", finalNestedCounts.getOrDefault(grand.getId(), 0L));
                        gm.put("image", images.get(grand.getId()));
                        return gm;
                    }).toList());
                    return cm;
                }).toList());
            }
            return m;
        });
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detail(Integer id) {
        Category c = find(id);
        List<Category> children = categoryRepository.findByParentIdIn(List.of(id));
        Set<Integer> imageIds = new HashSet<>();
        imageIds.add(id);
        children.forEach(ch -> imageIds.add(ch.getId()));
        Map<Integer, String> images = imagesOf(imageIds);

        Map<String, Object> m = CategoryView.base(c);
        m.put("children_count", (long) children.size());
        m.put("parent", c.getParentId() == null ? null
                : CategoryView.parentRef(categoryRepository.findById(c.getParentId()).orElse(null)));
        m.put("children", children.stream().map(ch -> {
            Map<String, Object> cm = CategoryView.childRef(ch);
            cm.put("image", images.get(ch.getId()));
            return cm;
        }).toList());
        m.put("image", images.get(id));
        m.put("brand_ids", categoryRepository.findBrandIds(id));
        return m;
    }

    @Transactional
    public Map<String, Object> create(CategoryRequest req) {
        Validator v = requestValidator.validate(req, CategoryRequest.OnCreate.class);
        if (!v.has("code") && categoryRepository.existsByCode(req.code().trim())) {
            v.add("code", "Mã danh mục này đã tồn tại");
        }
        if (!v.has("name") && categoryRepository.existsByName(req.name().trim())) {
            v.add("name", "Tên danh mục này đã tồn tại");
        }
        validateCommon(v, req, null);
        v.throwIfFailed();

        Category c = new Category();
        c.setParentId(req.parentId());
        c.setCode(req.code().trim());
        c.setName(req.name().trim());
        c.setSlug(Slugs.slug(req.name()));
        c.setDescription(req.description());
        c.setIcon(req.icon());
        c.setColor(req.color());
        c.setDisplayType(req.displayType() == null ? "icon" : req.displayType());
        c.setStatus(Integer.parseInt(req.status()));
        categoryRepository.saveAndFlush(c);
        syncBrands(c.getId(), req.brandIds());
        return CategoryView.base(c);
    }

    @Transactional
    public Map<String, Object> update(Integer id, CategoryRequest req) {
        Category c = find(id);
        Validator v = requestValidator.validate(req);
        if (!v.has("name") && categoryRepository.existsByNameAndIdNot(req.name().trim(), id)) {
            v.add("name", "Tên danh mục này đã tồn tại");
        }
        validateCommon(v, req, id);
        v.throwIfFailed();

        c.setParentId(req.parentId());
        c.setName(req.name().trim());
        c.setSlug(Slugs.slug(req.name()));
        c.setDescription(req.description());
        c.setIcon(req.icon());
        c.setColor(req.color());
        if (req.displayType() != null) {
            c.setDisplayType(req.displayType());
        }
        c.setStatus(Integer.parseInt(req.status()));
        categoryRepository.saveAndFlush(c);
        syncBrands(id, req.brandIds());
        return CategoryView.base(c);
    }

    @Transactional
    public void delete(Integer id) {
        Category c = find(id);
        if (categoryRepository.existsByParentId(id)) {
            throw ApiException.conflict("Danh mục đang có danh mục con, vui lòng xóa các danh mục con trước");
        }
        categoryImageRepository.deleteByCategoryId(id);
        categoryRepository.delete(c);
    }

    public String uploadImage(Integer id, MultipartFile file) {
        Category c = find(id);
        Validator v = new Validator();
        if (file == null || file.isEmpty()) {
            v.add("image", "Vui lòng chọn ảnh");
        } else {
            ImageRules.check(v, List.of(file), "image", false, null,
                    "Tệp phải là hình ảnh", "Tệp phải là hình ảnh", "Ảnh không được vượt quá 5MB");
        }
        v.throwIfFailed();

        String url = cloudinaryService.uploadImage(file, "category-images");
        CategoryImage image = categoryImageRepository.findFirstByCategoryId(id).orElseGet(() -> {
            CategoryImage ci = new CategoryImage();
            ci.setCategoryId(id);
            ci.setCreatedAt(Instant.now());
            return ci;
        });
        image.setImage(url);
        image.setUpdatedAt(Instant.now());
        categoryImageRepository.save(image);

        c.setDisplayType("image");
        categoryRepository.save(c);
        return url;
    }

    public void deleteImage(Integer id) {
        Category c = find(id);
        categoryImageRepository.deleteByCategoryId(id);
        c.setDisplayType("icon");
        categoryRepository.save(c);
    }

    public Category find(Integer id) {
        return categoryRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục"));
    }

    // ------------------------------------------------------------------

    private void validateCommon(Validator v, CategoryRequest req, Integer currentId) {
        if ("icon".equals(req.displayType())) {
            v.check(req.icon() != null && !req.icon().isBlank(), "icon", "Vui lòng nhập tên icon");
            v.check(req.color() != null && !req.color().isBlank(), "color", "Vui lòng nhập màu icon");
        }
        if (req.parentId() != null && !v.has("parent_id")) {
            if (currentId != null && req.parentId().equals(currentId)) {
                v.add("parent_id", "Danh mục không thể là danh mục cha của chính nó");
            } else if (!categoryRepository.existsById(req.parentId())) {
                v.add("parent_id", "Danh mục cha được chọn không tồn tại");
            } else if (currentId != null && createsCycle(req.parentId(), currentId)) {
                v.add("parent_id", "Không thể chọn danh mục con/cháu của chính nó làm danh mục cha (tạo vòng lặp)");
            }
        }
        if (req.brandIds() != null && !req.brandIds().isEmpty()) {
            Set<Integer> unique = new LinkedHashSet<>(req.brandIds());
            if (unique.contains(null) || brandRepository.countByIdIn(unique) != unique.size()) {
                v.add("brand_ids", "Thương hiệu được chọn không tồn tại");
            }
        }
    }

    /** Leo ngược cây từ parent mới; gặp chính danh mục đang sửa → vòng lặp (giới hạn 50 cấp). */
    private boolean createsCycle(Integer parentId, Integer currentId) {
        Category ancestor = categoryRepository.findById(parentId).orElse(null);
        int guard = 0;
        while (ancestor != null && guard < 50) {
            if (ancestor.getId().equals(currentId)) {
                return true;
            }
            ancestor = ancestor.getParentId() == null ? null : categoryRepository.findById(ancestor.getParentId()).orElse(null);
            guard++;
        }
        return false;
    }

    private void syncBrands(Integer categoryId, List<Integer> brandIds) {
        categoryRepository.detachBrands(categoryId);
        if (brandIds != null) {
            new LinkedHashSet<>(brandIds).forEach(b -> categoryRepository.attachBrand(categoryId, b));
        }
    }

    private Map<Integer, String> imagesOf(Collection<Integer> categoryIds) {
        if (categoryIds.isEmpty()) {
            return Map.of();
        }
        Map<Integer, String> out = new HashMap<>();
        categoryImageRepository.findByCategoryIdIn(categoryIds).forEach(ci -> out.put(ci.getCategoryId(), ci.getImage()));
        return out;
    }

    private static Map<Integer, Long> toCountMap(List<Object[]> rows) {
        Map<Integer, Long> out = new HashMap<>();
        for (Object[] r : rows) {
            out.put(((Number) r[0]).intValue(), ((Number) r[1]).longValue());
        }
        return out;
    }
}
