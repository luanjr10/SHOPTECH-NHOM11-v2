package com.shoptech.modules.commission.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.util.Json;
import com.shoptech.modules.cart.entity.CartItem;
import com.shoptech.modules.cart.repository.CartItemRepository;
import com.shoptech.modules.cart.repository.CartRepository;
import com.shoptech.modules.category.entity.Category;
import com.shoptech.modules.category.repository.CategoryRepository;
import com.shoptech.modules.commission.dto.CommissionRequest;
import com.shoptech.modules.commission.dto.CommissionResponse;
import com.shoptech.modules.commission.entity.CommissionSetting;
import com.shoptech.modules.commission.repository.CommissionSettingRepository;
import com.shoptech.modules.product.document.ProductSpecification;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.product.repository.ProductSpecificationRepository;
import com.shoptech.modules.product.service.ProductPricing;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommissionService {

    private final CommissionSettingRepository commissionRepository;
    private final CategoryRepository categoryRepository;
    private final StoreRepository storeRepository;
    private final RequestValidator requestValidator;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final ProductSpecificationRepository specificationRepository;
    private final Json json;

    /** Tạm tính của một gian hàng trong giỏ/đơn, kèm danh mục duy nhất (null nếu nhiều danh mục). */
    public record Group(Long storeId, BigDecimal subtotal, Integer categoryId) {
    }

    @Transactional(readOnly = true)
    public List<CommissionResponse> list() {
        List<CommissionSetting> settings = commissionRepository.findAllByOrderByScopeAsc();
        Map<Integer, String> categories = categoryRepository.findAllById(settings.stream()
                        .map(CommissionSetting::getCategoryId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Category::getId, Category::getName));
        Map<Long, String> stores = storeRepository.findByIdIn(settings.stream()
                        .map(CommissionSetting::getStoreId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Store::getId, Store::getName));
        return settings.stream().map(s -> view(s, categories, stores)).toList();
    }

    /**
     * Tỉ lệ hoa hồng (%) áp cho một phần đơn lúc đặt hàng — ưu tiên: gian hàng → danh mục → mặc định.
     * Tỉ lệ được chốt (snapshot) vào seller_orders.commission_rate nên đổi cấu hình sau không ảnh hưởng đơn cũ.
     */
    @Transactional(readOnly = true)
    public BigDecimal resolveRate(Long storeId, Integer categoryId) {
        return commissionRepository.findFirstByScopeAndStoreId("store", storeId)
                .filter(CommissionSetting::isActive)
                .or(() -> categoryId == null ? Optional.empty()
                        : commissionRepository.findFirstByScopeAndCategoryId("category", categoryId)
                        .filter(CommissionSetting::isActive))
                .or(() -> commissionRepository.findFirstByScope("default").filter(CommissionSetting::isActive))
                .map(CommissionSetting::getRate)
                .orElse(BigDecimal.ZERO);
    }

    /** Tổng hoa hồng sàn thu được từ các nhóm gian hàng — mức giảm của voucher sàn không được vượt số này. */
    @Transactional(readOnly = true)
    public BigDecimal estimateTotal(List<Group> groups) {
        BigDecimal total = BigDecimal.ZERO;
        for (Group g : groups) {
            total = total.add(g.subtotal().multiply(resolveRate(g.storeId(), g.categoryId())).movePointLeft(2));
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }

    /** Các nhóm theo gian hàng của giỏ hàng hiện tại (bỏ sản phẩm ngừng bán / không có gian hàng). */
    @Transactional(readOnly = true)
    public List<Group> cartGroups(Long userId) {
        List<CartItem> items = cartRepository.findByUserId(userId)
                .map(c -> cartItemRepository.findByCartIdOrderByIdAsc(c.getId())).orElse(List.of());
        Map<Long, BigDecimal> subtotals = new LinkedHashMap<>();
        Map<Long, LinkedHashSet<Integer>> categories = new LinkedHashMap<>();
        for (CartItem item : items) {
            Product product = productRepository.findById(item.getProductId()).orElse(null);
            if (product == null || !Objects.equals(product.getStatus(), 1) || product.getStoreId() == null) {
                continue;
            }
            List<Map<String, Object>> variants = specificationRepository.findFirstByProductId(product.getId())
                    .map(ProductSpecification::getVariants).map(json::mapListOf).orElse(List.of());
            String sku = item.getSku() == null || item.getSku().isEmpty() ? null : item.getSku();
            BigDecimal line = ProductPricing.unitPrice(product, variants, sku).multiply(BigDecimal.valueOf(item.getQuantity()));
            subtotals.merge(product.getStoreId(), line, BigDecimal::add);
            categories.computeIfAbsent(product.getStoreId(), k -> new LinkedHashSet<>()).add(product.getCategoryId());
        }
        List<Group> groups = new ArrayList<>();
        subtotals.forEach((storeId, subtotal) -> {
            LinkedHashSet<Integer> cats = categories.get(storeId);
            groups.add(new Group(storeId, subtotal, cats.size() == 1 ? cats.iterator().next() : null));
        });
        return groups;
    }

    /** Tạo mới hoặc cập nhật cấu hình theo (phạm vi + danh mục/gian hàng). */
    @Transactional
    public CommissionResponse upsert(CommissionRequest req) {
        Validator v = requestValidator.validate(req);
        if (!v.has("scope")) {
            if (CommissionSetting.SCOPE_CATEGORY.equals(req.scope())) {
                if (req.categoryId() == null) {
                    v.add("category_id", "Vui lòng chọn danh mục");
                } else if (!categoryRepository.existsById(req.categoryId())) {
                    v.add("category_id", "Danh mục không tồn tại");
                }
            }
            if (CommissionSetting.SCOPE_STORE.equals(req.scope())) {
                if (req.storeId() == null) {
                    v.add("store_id", "Vui lòng chọn gian hàng");
                } else if (!storeRepository.existsById(req.storeId())) {
                    v.add("store_id", "Gian hàng không tồn tại");
                }
            }
        }
        v.throwIfFailed();

        CommissionSetting setting = (switch (req.scope()) {
            case CommissionSetting.SCOPE_CATEGORY ->
                    commissionRepository.findFirstByScopeAndCategoryId(req.scope(), req.categoryId());
            case CommissionSetting.SCOPE_STORE -> commissionRepository.findFirstByScopeAndStoreId(req.scope(), req.storeId());
            default -> commissionRepository.findFirstByScope(CommissionSetting.SCOPE_DEFAULT);
        }).orElseGet(CommissionSetting::new);

        setting.setScope(req.scope());
        setting.setRate(req.rate());
        setting.setActive(req.isActive() == null || req.isActive());
        setting.setCategoryId(CommissionSetting.SCOPE_CATEGORY.equals(req.scope()) ? req.categoryId() : null);
        setting.setStoreId(CommissionSetting.SCOPE_STORE.equals(req.scope()) ? req.storeId() : null);
        commissionRepository.saveAndFlush(setting);

        Map<Integer, String> categories = setting.getCategoryId() == null ? Map.of()
                : categoryRepository.findById(setting.getCategoryId())
                .map(c -> Map.of(c.getId(), c.getName())).orElse(Map.of());
        Map<Long, String> stores = setting.getStoreId() == null ? Map.of()
                : storeRepository.findById(setting.getStoreId())
                .map(s -> Map.of(s.getId(), s.getName())).orElse(Map.of());
        return view(setting, categories, stores);
    }

    @Transactional
    public void delete(Long id) {
        CommissionSetting setting = commissionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy cấu hình hoa hồng"));
        if (CommissionSetting.SCOPE_DEFAULT.equals(setting.getScope())) {
            throw ApiException.unprocessable("Không thể xóa cấu hình mặc định");
        }
        commissionRepository.delete(setting);
    }

    private static CommissionResponse view(CommissionSetting s, Map<Integer, String> categories, Map<Long, String> stores) {
        return new CommissionResponse(s,
                s.getCategoryId() == null ? null : new CommissionResponse.Ref(s.getCategoryId(), categories.get(s.getCategoryId())),
                s.getStoreId() == null ? null : new CommissionResponse.StoreRef(s.getStoreId(), stores.get(s.getStoreId())));
    }
}
