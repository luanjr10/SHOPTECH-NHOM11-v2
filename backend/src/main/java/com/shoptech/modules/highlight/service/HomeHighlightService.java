package com.shoptech.modules.highlight.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.response.Pagination;
import com.shoptech.modules.brand.entity.Brand;
import com.shoptech.modules.brand.repository.BrandRepository;
import com.shoptech.modules.highlight.dto.HighlightProduct;
import com.shoptech.modules.product.document.ProductImage;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductImageRepository;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.setting.entity.SiteSetting;
import com.shoptech.modules.setting.repository.SiteSettingRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HomeHighlightService {

    public static final String FLASH_SALE_ENDS_AT = "flash_sale_ends_at";
    private static final int PER_PAGE = 10;

    private final SiteSettingRepository settingRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final BrandRepository brandRepository;

    @Transactional(readOnly = true)
    public String flashSaleEndsAt() {
        return settingRepository.findByKey(FLASH_SALE_ENDS_AT).map(SiteSetting::getValue).orElse(null);
    }

    @Transactional
    public String updateFlashSale(String endsAt) {
        String value = endsAt == null || endsAt.isBlank() ? null : endsAt.trim();
        if (value != null && !isDate(value)) {
            throw ValidationException.of("ends_at", "Thời gian kết thúc không hợp lệ");
        }
        SiteSetting setting = settingRepository.findByKey(FLASH_SALE_ENDS_AT).orElseGet(() -> {
            SiteSetting s = new SiteSetting();
            s.setKey(FLASH_SALE_ENDS_AT);
            return s;
        });
        setting.setValue(value);
        settingRepository.save(setting);
        return value;
    }

    @Transactional(readOnly = true)
    public Page<HighlightProduct> products(String search, String highlight, Integer page, Integer perPage) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            String term = search == null ? "" : search.trim();
            if (!term.isEmpty()) {
                String like = "%" + term + "%";
                where.add(cb.or(cb.like(root.get("name"), like), cb.like(root.get("code"), like)));
            }
            if ("featured".equals(highlight)) {
                where.add(cb.isTrue(root.get("isFeatured")));
            } else if ("flash_sale".equals(highlight)) {
                where.add(cb.isTrue(root.get("isFlashSale")));
            }
            return cb.and(where.toArray(Predicate[]::new));
        };
        Page<Product> result = productRepository.findAll(spec,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()));
        List<Product> products = result.getContent();

        Map<Integer, List<String>> images = products.isEmpty() ? Map.of()
                : imageRepository.findByProductIdIn(products.stream().map(Product::getId).toList()).stream()
                .collect(Collectors.toMap(ProductImage::getProductId,
                        pi -> pi.getImages() == null ? List.<String>of() : pi.getImages(), (a, b) -> a));
        Map<Integer, String> brands = brandRepository.findAllById(products.stream()
                        .map(Product::getBrandId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Brand::getId, Brand::getName));

        return result.map(p -> {
            List<String> imgs = images.getOrDefault(p.getId(), List.of());
            return new HighlightProduct(p.getId(), p.getCode(), p.getName(), imgs.isEmpty() ? null : imgs.get(0),
                    p.getPrice(), p.getDiscountPercent(), p.isFeatured(), p.isFlashSale(),
                    p.getBrandId() == null ? null : brands.get(p.getBrandId()));
        });
    }

    /** Bật/tắt cờ "nổi bật" / "flash sale"; trường nào không gửi thì giữ nguyên. */
    @Transactional
    public Product updateFlags(Integer id, Boolean isFeatured, Boolean isFlashSale) {
        Product product = productRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));
        if (isFeatured != null) {
            product.setFeatured(isFeatured);
        }
        if (isFlashSale != null) {
            product.setFlashSale(isFlashSale);
        }
        return productRepository.saveAndFlush(product);
    }

    private static boolean isDate(String value) {
        for (DateTimeFormatter f : List.of(DateTimeFormatter.ISO_OFFSET_DATE_TIME, DateTimeFormatter.ISO_LOCAL_DATE_TIME,
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"), DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))) {
            try {
                if (f == DateTimeFormatter.ISO_OFFSET_DATE_TIME) {
                    OffsetDateTime.parse(value, f);
                } else {
                    LocalDateTime.parse(value, f);
                }
                return true;
            } catch (DateTimeParseException ignored) {
                // thử định dạng tiếp theo
            }
        }
        try {
            LocalDate.parse(value);
            return true;
        } catch (DateTimeParseException e) {
            return false;
        }
    }
}
