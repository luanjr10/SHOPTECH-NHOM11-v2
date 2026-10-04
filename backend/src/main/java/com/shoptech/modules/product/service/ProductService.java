package com.shoptech.modules.product.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.Pagination;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.common.util.Json;
import com.shoptech.common.util.Numbers;
import com.shoptech.common.util.Slugs;
import com.shoptech.modules.category.repository.CategoryRepository;
import com.shoptech.modules.product.document.ProductImage;
import com.shoptech.modules.product.document.ProductSpecification;
import com.shoptech.modules.product.document.ProductUseCase;
import com.shoptech.modules.product.dto.ProductDetailResponse;
import com.shoptech.modules.product.dto.ProductForm;
import com.shoptech.modules.product.dto.ProductResponse;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductImageRepository;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.product.repository.ProductSpecificationRepository;
import com.shoptech.modules.product.repository.ProductUseCaseRepository;
import com.shoptech.modules.store.dto.StoreSummary;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import com.shoptech.modules.usecase.document.UseCase;
import com.shoptech.modules.usecase.service.UseCaseService;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private static final int PER_PAGE = 6;

    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final ProductSpecificationRepository specificationRepository;
    private final ProductUseCaseRepository productUseCaseRepository;
    private final CategoryRepository categoryRepository;
    private final StoreRepository storeRepository;
    private final UseCaseService useCaseService;
    private final CloudinaryService cloudinaryService;
    private final RequestValidator requestValidator;
    private final Json json;

    public record ListQuery(String search, String sort, String categoryId, String brandId, String storeId,
                            String provinceId, String useCase, String useCaseId, String isFeatured,
                            String isFlashSale, Integer page, Integer perPage) {
    }

    // ------------------------------------------------------------------ đọc

    public Page<ProductResponse> list(ListQuery q) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            String search = q.search() == null ? "" : q.search().trim();
            if (!search.isEmpty()) {
                String like = "%" + search + "%";
                where.add(cb.or(cb.like(root.get("name"), like), cb.like(root.get("code"), like)));
            }
            if (present(q.categoryId())) {
                where.add(cb.equal(root.get("categoryId"), Numbers.toIntOrZero(q.categoryId())));
            }
            if (present(q.brandId())) {
                where.add(cb.equal(root.get("brandId"), Numbers.toIntOrZero(q.brandId())));
            }
            if (present(q.storeId())) {
                where.add(cb.equal(root.get("storeId"), (long) Numbers.toIntOrZero(q.storeId())));
            }
            if (present(q.provinceId())) {
                Subquery<Long> stores = query.subquery(Long.class);
                var store = stores.from(Store.class);
                stores.select(store.get("id")).where(cb.equal(store.get("provinceId"), (long) Numbers.toIntOrZero(q.provinceId())));
                where.add(root.get("storeId").in(stores));
            }
            if (present(q.isFeatured())) {
                where.add(cb.equal(root.get("isFeatured"), Numbers.toBool(q.isFeatured())));
            }
            if (present(q.isFlashSale())) {
                where.add(cb.equal(root.get("isFlashSale"), Numbers.toBool(q.isFlashSale())));
            }
            if (present(q.useCase()) || present(q.useCaseId())) {
                List<Integer> ids = productIdsForUseCase(q);
                where.add(ids.isEmpty() ? cb.disjunction() : root.get("id").in(ids));
            }
            return cb.and(where.toArray(Predicate[]::new));
        };

        Sort order = switch (q.sort() == null ? "" : q.sort()) {
            case "price_asc" -> Sort.by("price").ascending();
            case "price_desc" -> Sort.by("price").descending();
            case "discount_desc" -> Sort.by("discountPercent").descending();
            default -> Sort.by("createdAt").descending();
        };

        Page<Product> page = productRepository.findAll(spec, Pagination.of(q.page(), q.perPage(), PER_PAGE, order));
        List<Integer> ids = page.getContent().stream().map(Product::getId).toList();
        Map<Integer, List<String>> images = ids.isEmpty() ? Map.of()
                : imageRepository.findByProductIdIn(ids).stream()
                .collect(Collectors.toMap(ProductImage::getProductId, pi -> nonNull(pi.getImages()), (a, b) -> a));
        Map<Long, StoreSummary> stores = storesOf(page.getContent());

        return page.map(p -> ProductResponse.of(p, stores.get(p.getStoreId()), images.get(p.getId())));
    }

    public ProductDetailResponse detail(String idOrSlug) {
        Product product = (Numbers.isInteger(idOrSlug)
                ? productRepository.findById(Integer.parseInt(idOrSlug.trim()))
                : productRepository.findFirstBySlug(idOrSlug))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));
        return toDetail(product);
    }

    // ------------------------------------------------------------------ ghi

    public ProductResponse create(ProductForm form, List<MultipartFile> rawImages) {
        return create(form, rawImages, null);
    }

    /** @param storeId gian hàng sở hữu (Seller Center); null khi admin tạo. */
    public ProductResponse create(ProductForm form, List<MultipartFile> rawImages, Long storeId) {
        List<MultipartFile> images = ImageRules.nonEmpty(rawImages);
        Validator v = requestValidator.validate(form, ProductForm.OnCreate.class);
        if (!v.has("code") && productRepository.existsByCode(form.code().trim())) {
            v.add("code", "Mã sản phẩm này đã tồn tại");
        }
        validateCommon(v, form);
        if (images.isEmpty()) {
            v.add("images", "Vui lòng chọn ít nhất một ảnh sản phẩm");
        }
        checkImages(v, images);
        v.throwIfFailed();

        List<String> urls = cloudinaryService.uploadImages(images);

        Product product = new Product();
        product.setCode(form.code().trim());
        product.setName(form.name().trim());
        product.setSlug(Slugs.slug(form.name() + "-" + form.code()));
        product.setStoreId(storeId);
        applyForm(product, form);
        productRepository.saveAndFlush(product);

        saveImages(product.getId(), urls);
        saveSpecification(product, form);
        syncUseCases(product, form);

        return ProductResponse.of(product, null, urls);
    }

    public ProductDetailResponse update(Integer id, ProductForm form, List<MultipartFile> rawImages) {
        return update(id, form, rawImages, null);
    }

    /** @param storeId khi khác null: sản phẩm phải thuộc gian hàng này (Seller Center). */
    public ProductDetailResponse update(Integer id, ProductForm form, List<MultipartFile> rawImages, Long storeId) {
        Product product = find(id, storeId);
        List<MultipartFile> images = ImageRules.nonEmpty(rawImages);
        Validator v = requestValidator.validate(form);
        validateCommon(v, form);
        if (!json.isValid(form.existingImages())) {
            v.add("existing_images", "Dữ liệu ảnh hiện tại không hợp lệ");
        }
        checkImages(v, images);
        v.throwIfFailed();

        List<String> kept = json.stringList(form.existingImages());
        List<String> uploaded = images.isEmpty() ? List.of() : cloudinaryService.uploadImages(images);
        List<String> all = new ArrayList<>(kept);
        all.addAll(uploaded);
        if (all.isEmpty()) {
            throw ApiException.unprocessable("Sản phẩm phải có ít nhất một ảnh");
        }

        product.setName(form.name().trim());
        applyForm(product, form);
        productRepository.saveAndFlush(product);

        saveImages(product.getId(), all);
        saveSpecification(product, form);
        syncUseCases(product, form);

        return toDetail(product);
    }

    public void delete(Integer id) {
        delete(id, null);
    }

    public void delete(Integer id, Long storeId) {
        Product product = find(id, storeId);
        imageRepository.deleteByProductId(id);
        specificationRepository.deleteByProductId(id);
        productUseCaseRepository.deleteByProductId(id);
        productRepository.delete(product);
    }

    // ------------------------------------------------------------------ helpers

    private ProductDetailResponse toDetail(Product product) {
        Integer id = product.getId();
        ProductSpecification spec = specificationRepository.findFirstByProductId(id).orElse(null);
        List<String> images = imageRepository.findFirstByProductId(id).map(pi -> nonNull(pi.getImages())).orElse(List.of());
        List<String> useCaseIds = productUseCaseRepository.findFirstByProductId(id)
                .map(pu -> json.listOf(pu.getUseCaseIds()).stream().map(String::valueOf).toList())
                .orElse(List.of());
        StoreSummary store = product.getStoreId() == null ? null
                : storeRepository.findById(product.getStoreId()).map(StoreSummary::of).orElse(null);

        long count = 0;
        long weighted = 0;
        for (Object[] row : productRepository.ratingBreakdown(id)) {
            int star = ((Number) row[0]).intValue();
            long c = ((Number) row[1]).longValue();
            if (star >= 1 && star <= 5) {
                count += c;
                weighted += star * c;
            }
        }
        double average = count > 0
                ? BigDecimal.valueOf(weighted).divide(BigDecimal.valueOf(count), 1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        return new ProductDetailResponse(
                ProductResponse.of(product, store, images),
                spec == null ? List.of() : json.listOf(spec.getSpecifications()),
                ProductCatalogSupport.resolveVariants(spec == null ? null : json.mapListOf(spec.getVariants()), product),
                useCaseIds,
                average,
                count);
    }

    private void applyForm(Product product, ProductForm form) {
        product.setPrice(new BigDecimal(form.price().trim()));
        product.setDiscountPercent(present(form.discountPercent()) ? Integer.parseInt(form.discountPercent().trim()) : 0);
        product.setStock(Integer.parseInt(form.stock().trim()));
        product.setStatus(Integer.parseInt(form.status()));
        product.setCategoryId(Integer.parseInt(form.categoryId().trim()));
    }

    private void validateCommon(Validator v, ProductForm form) {
        if (!v.has("price") && new BigDecimal(form.price().trim()).signum() < 0) {
            v.add("price", "Giá sản phẩm không được nhỏ hơn 0");
        }
        if (!v.has("discount_percent") && present(form.discountPercent())) {
            int d = Integer.parseInt(form.discountPercent().trim());
            v.check(d >= 0, "discount_percent", "Giảm giá không được nhỏ hơn 0%");
            v.check(d <= 100, "discount_percent", "Giảm giá không được vượt quá 100%");
        }
        if (!v.has("stock") && Integer.parseInt(form.stock().trim()) < 0) {
            v.add("stock", "Số lượng tồn kho không được nhỏ hơn 0");
        }
        if (!v.has("category_id") && !categoryRepository.existsById(Integer.parseInt(form.categoryId().trim()))) {
            v.add("category_id", "Danh mục đã chọn không tồn tại");
        }
        v.check(json.isValid(form.specifications()), "specifications", "Dữ liệu thông số kỹ thuật không hợp lệ");
        v.check(json.isValid(form.variants()), "variants", "Dữ liệu biến thể không hợp lệ");
        v.check(json.isValid(form.useCaseIds()), "use_case_ids", "Dữ liệu Quick Link không hợp lệ");
    }

    private static void checkImages(Validator v, List<MultipartFile> images) {
        ImageRules.check(v, images, "images", true, ImageRules.DEFAULT_EXT,
                "File tải lên phải là hình ảnh",
                "Ảnh phải có định dạng jpg, jpeg, png hoặc webp",
                "Dung lượng mỗi ảnh không được vượt quá 5MB");
    }

    private void saveImages(Integer productId, List<String> urls) {
        ProductImage doc = imageRepository.findFirstByProductId(productId).orElseGet(() -> {
            ProductImage pi = new ProductImage();
            pi.setProductId(productId);
            pi.setCreatedAt(Instant.now());
            return pi;
        });
        doc.setImages(urls);
        doc.setUpdatedAt(Instant.now());
        imageRepository.save(doc);
    }

    private void saveSpecification(Product product, ProductForm form) {
        Object parsed = json.parse(form.specifications());
        List<Object> specifications = parsed instanceof List<?> l ? new ArrayList<>(l) : new ArrayList<>();
        List<Map<String, Object>> variants = ProductCatalogSupport.normalizeVariants(json.mapList(form.variants()), product);

        ProductSpecification doc = specificationRepository.findFirstByProductId(product.getId()).orElseGet(() -> {
            ProductSpecification ps = new ProductSpecification();
            ps.setProductId(product.getId());
            ps.setCreatedAt(Instant.now());
            return ps;
        });
        // Ghi dạng chuỗi JSON cho đồng nhất với dữ liệu sẵn có.
        doc.setSpecifications(json.write(specifications));
        doc.setVariants(json.write(variants));
        doc.setUpdatedAt(Instant.now());
        specificationRepository.save(doc);
    }

    private void syncUseCases(Product product, ProductForm form) {
        List<String> ids = useCaseService.sanitizeIds(json.stringList(form.useCaseIds()), product.getCategoryId());
        ProductUseCase doc = productUseCaseRepository.findFirstByProductId(product.getId()).orElseGet(() -> {
            ProductUseCase pu = new ProductUseCase();
            pu.setProductId(product.getId());
            pu.setCreatedAt(Instant.now());
            return pu;
        });
        doc.setUseCaseIds(ids);
        doc.setUpdatedAt(Instant.now());
        productUseCaseRepository.save(doc);
    }

    private List<Integer> productIdsForUseCase(ListQuery q) {
        UseCase useCase = useCaseService.resolve(q.useCase(), q.useCaseId(),
                present(q.categoryId()) ? Numbers.toIntOrZero(q.categoryId()) : null);
        if (useCase == null) {
            return List.of();
        }
        return productUseCaseRepository.findByUseCaseId(useCase.getId()).stream()
                .map(ProductUseCase::getProductId).filter(Objects::nonNull).toList();
    }

    private Map<Long, StoreSummary> storesOf(List<Product> products) {
        Set<Long> ids = products.stream().map(Product::getStoreId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, StoreSummary> out = new HashMap<>();
        if (!ids.isEmpty()) {
            storeRepository.findByIdIn(ids).forEach(s -> out.put(s.getId(), StoreSummary.of(s)));
        }
        return out;
    }

    private Product find(Integer id, Long storeId) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));
        if (storeId != null && !storeId.equals(product.getStoreId())) {
            throw ApiException.notFound("Sản phẩm không thuộc gian hàng này");
        }
        return product;
    }

    private static boolean present(String s) {
        return s != null && !s.isEmpty();
    }

    private static <T> List<T> nonNull(List<T> list) {
        return list == null ? List.of() : list;
    }
}
