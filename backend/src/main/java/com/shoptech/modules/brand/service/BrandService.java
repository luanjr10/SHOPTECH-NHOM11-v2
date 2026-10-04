package com.shoptech.modules.brand.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.Pagination;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.common.util.Json;
import com.shoptech.common.util.Slugs;
import com.shoptech.modules.brand.dto.BrandForm;
import com.shoptech.modules.brand.dto.BrandResponse;
import com.shoptech.modules.brand.entity.Brand;
import com.shoptech.modules.brand.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BrandService {

    private static final int PER_PAGE = 6;

    private final BrandRepository brandRepository;
    private final CloudinaryService cloudinaryService;
    private final RequestValidator requestValidator;
    private final Json json;

    @Transactional(readOnly = true)
    public Page<BrandResponse> list(String search, String sort, Integer page, Integer perPage) {
        Sort order = switch (sort == null ? "" : sort) {
            case "name_asc" -> Sort.by("name").ascending();
            case "name_desc" -> Sort.by("name").descending();
            default -> Sort.by("createdAt").descending();
        };
        String term = search == null || search.isBlank() ? null : search.trim();
        return brandRepository.search(term, Pagination.of(page, perPage, PER_PAGE, order)).map(BrandResponse::of);
    }

    @Transactional(readOnly = true)
    public List<BrandResponse> all() {
        return brandRepository.findAll().stream().map(BrandResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public BrandResponse detail(Integer id) {
        return BrandResponse.of(find(id));
    }

    @Transactional
    public BrandResponse create(BrandForm form, List<MultipartFile> rawImages) {
        List<MultipartFile> images = ImageRules.nonEmpty(rawImages);
        Validator v = requestValidator.validate(form, BrandForm.OnCreate.class);
        if (!v.has("code") && brandRepository.existsByCode(form.code().trim())) {
            v.add("code", "Mã thương hiệu này đã tồn tại");
        }
        if (!v.has("name") && brandRepository.existsByName(form.name().trim())) {
            v.add("name", "Tên thương hiệu này đã tồn tại");
        }
        if (images.isEmpty()) {
            v.add("images", "Vui lòng chọn ít nhất một ảnh thương hiệu");
        } else if (images.size() > 1) {
            v.add("images", "Thương hiệu chỉ được phép có một ảnh");
        }
        checkImages(v, images);
        v.throwIfFailed();

        List<String> urls = cloudinaryService.uploadImages(images);
        Brand brand = new Brand();
        brand.setCode(form.code().trim());
        brand.setName(form.name().trim());
        brand.setLogo(urls.isEmpty() ? null : urls.get(0));
        brand.setDescription(form.description());
        brand.setSlug(Slugs.slug(form.name() + "-" + form.code()));
        brand.setStatus(Integer.parseInt(form.status()));
        brandRepository.save(brand);
        return BrandResponse.of(brand, urls);
    }

    @Transactional
    public BrandResponse update(Integer id, BrandForm form, List<MultipartFile> rawImages) {
        Brand brand = find(id);
        List<MultipartFile> images = ImageRules.nonEmpty(rawImages);

        Validator v = requestValidator.validate(form);
        if (!v.has("name") && brandRepository.existsByNameAndIdNot(form.name().trim(), id)) {
            v.add("name", "Tên thương hiệu này đã tồn tại");
        }
        if (!json.isValid(form.existingImages())) {
            v.add("existing_images", "Dữ liệu ảnh hiện tại không hợp lệ");
        }
        if (images.size() > 1) {
            v.add("images", "Thương hiệu chỉ được phép có một ảnh");
        }
        checkImages(v, images);
        v.throwIfFailed();

        List<String> kept = json.stringList(form.existingImages());
        List<String> uploaded = images.isEmpty() ? List.of() : cloudinaryService.uploadImages(images);
        String logo = !uploaded.isEmpty() ? uploaded.get(0) : (kept.isEmpty() ? null : kept.get(0));
        if (logo == null) {
            throw ApiException.unprocessable("Thương hiệu phải có một ảnh");
        }

        brand.setName(form.name().trim());
        brand.setSlug("brand-" + Slugs.slug(form.name()));
        brand.setLogo(logo);
        brand.setDescription(form.description());
        brand.setStatus(Integer.parseInt(form.status()));
        brandRepository.saveAndFlush(brand);
        return BrandResponse.of(brand, List.of(logo));
    }

    @Transactional
    public void delete(Integer id) {
        // category_brand cascade, products.brand_id set null — do FK trong DB xử lý.
        brandRepository.delete(find(id));
    }

    private Brand find(Integer id) {
        return brandRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy thương hiệu"));
    }

    private static void checkImages(Validator v, List<MultipartFile> images) {
        ImageRules.check(v, images, "images", true, ImageRules.DEFAULT_EXT,
                "File tải lên phải là hình ảnh",
                "Ảnh phải có định dạng jpg, jpeg, png hoặc webp",
                "Dung lượng mỗi ảnh không được vượt quá 5MB");
    }
}
