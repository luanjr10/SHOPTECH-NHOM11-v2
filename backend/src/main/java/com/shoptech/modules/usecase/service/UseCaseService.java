package com.shoptech.modules.usecase.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.common.util.Slugs;
import com.shoptech.modules.category.repository.CategoryRepository;
import com.shoptech.modules.usecase.document.UseCase;
import com.shoptech.modules.usecase.dto.UseCaseForm;
import com.shoptech.modules.usecase.dto.UseCaseResponse;
import com.shoptech.modules.usecase.repository.UseCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UseCaseService {

    private static final Sort BY_SORT_ORDER = Sort.by("sortOrder").ascending();
    private static final Set<String> EXT = Set.of("jpg", "jpeg", "png", "webp", "svg");

    private final UseCaseRepository useCaseRepository;
    private final CategoryRepository categoryRepository;
    private final CloudinaryService cloudinaryService;
    private final RequestValidator requestValidator;

    /** GET /api/use-cases?categoryId= — chỉ Quick Link đang bật (storefront). */
    public List<UseCaseResponse> activeByCategory(Integer categoryId) {
        return useCaseRepository.findByCategoryIdAndStatus(categoryId, true, BY_SORT_ORDER)
                .stream().map(UseCaseResponse::of).toList();
    }

    /** GET /api/categories/{id}/use-cases — tất cả (admin). */
    public List<UseCaseResponse> byCategory(Integer categoryId) {
        ensureCategory(categoryId);
        return useCaseRepository.findByCategoryId(categoryId, BY_SORT_ORDER).stream().map(UseCaseResponse::of).toList();
    }

    public UseCaseResponse create(Integer categoryId, UseCaseForm form, MultipartFile image) {
        Validator v = requestValidator.validate(form);
        if (image == null || image.isEmpty()) {
            v.add("image", "Vui lòng chọn ảnh cho Quick Link");
        } else {
            checkImage(v, image);
        }
        v.throwIfFailed();
        ensureCategory(categoryId);

        UseCase u = new UseCase();
        u.setCategoryId(categoryId);
        u.setName(form.name().trim());
        u.setSlug(uniqueSlug(form.name(), categoryId, null));
        u.setImage(cloudinaryService.uploadImage(image));
        u.setSortOrder(parseSortOrder(form.sortOrder(), 0));
        u.setStatus("1".equals(form.status()));
        u.setCreatedAt(Instant.now());
        u.setUpdatedAt(u.getCreatedAt());
        return UseCaseResponse.of(useCaseRepository.save(u));
    }

    public UseCaseResponse update(Integer categoryId, String useCaseId, UseCaseForm form, MultipartFile image) {
        Validator v = requestValidator.validate(form);
        if (image != null && !image.isEmpty()) {
            checkImage(v, image);
        }
        v.throwIfFailed();

        UseCase u = findInCategory(categoryId, useCaseId);
        u.setName(form.name().trim());
        u.setSlug(uniqueSlug(form.name(), categoryId, u.getId()));
        u.setSortOrder(parseSortOrder(form.sortOrder(), u.getSortOrder() == null ? 0 : u.getSortOrder()));
        u.setStatus("1".equals(form.status()));
        if (image != null && !image.isEmpty()) {
            u.setImage(cloudinaryService.uploadImage(image));
        }
        u.setUpdatedAt(Instant.now());
        return UseCaseResponse.of(useCaseRepository.save(u));
    }

    public void delete(Integer categoryId, String useCaseId) {
        useCaseRepository.delete(findInCategory(categoryId, useCaseId));
    }

    /** sanitizeUseCaseIds: bỏ trùng/rỗng, chỉ giữ id thuộc đúng danh mục của sản phẩm. */
    public List<String> sanitizeIds(Collection<String> rawIds, Integer categoryId) {
        Set<String> ids = new LinkedHashSet<>();
        rawIds.stream().filter(s -> s != null && !s.isBlank()).forEach(ids::add);
        if (ids.isEmpty() || categoryId == null) {
            return new ArrayList<>();
        }
        return useCaseRepository.findByIdInAndCategoryId(ids, categoryId).stream().map(UseCase::getId).toList();
    }

    /** Tìm Quick Link theo id hoặc slug (lọc sản phẩm ở storefront). */
    public UseCase resolve(String slug, String id, Integer categoryId) {
        if (id != null && !id.isBlank()) {
            return useCaseRepository.findById(id)
                    .filter(u -> categoryId == null || categoryId.equals(u.getCategoryId()))
                    .orElse(null);
        }
        return categoryId == null
                ? useCaseRepository.findFirstBySlug(slug).orElse(null)
                : useCaseRepository.findFirstBySlugAndCategoryId(slug, categoryId).orElse(null);
    }

    private UseCase findInCategory(Integer categoryId, String useCaseId) {
        return useCaseRepository.findByIdAndCategoryId(useCaseId, categoryId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy Quick Link trong danh mục này"));
    }

    private void ensureCategory(Integer categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw ApiException.notFound("Không tìm thấy danh mục");
        }
    }

    private String uniqueSlug(String name, Integer categoryId, String ignoreId) {
        String base = Slugs.slug(name);
        String slug = base;
        int suffix = 2;
        while (ignoreId == null
                ? useCaseRepository.existsByCategoryIdAndSlug(categoryId, slug)
                : useCaseRepository.existsByCategoryIdAndSlugAndIdNot(categoryId, slug, ignoreId)) {
            slug = base + "-" + suffix++;
        }
        return slug;
    }

    private static int parseSortOrder(String raw, int fallback) {
        return raw == null || raw.isBlank() ? fallback : Integer.parseInt(raw);
    }

    private static void checkImage(Validator v, MultipartFile image) {
        ImageRules.check(v, List.of(image), "image", false, EXT,
                "File tải lên phải là hình ảnh",
                "Ảnh phải có định dạng jpg, jpeg, png, webp hoặc svg",
                "Dung lượng ảnh không được vượt quá 5MB");
    }
}
