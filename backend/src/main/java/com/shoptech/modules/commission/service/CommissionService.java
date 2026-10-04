package com.shoptech.modules.commission.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.modules.category.entity.Category;
import com.shoptech.modules.category.repository.CategoryRepository;
import com.shoptech.modules.commission.dto.CommissionRequest;
import com.shoptech.modules.commission.dto.CommissionResponse;
import com.shoptech.modules.commission.entity.CommissionSetting;
import com.shoptech.modules.commission.repository.CommissionSettingRepository;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommissionService {

    private final CommissionSettingRepository commissionRepository;
    private final CategoryRepository categoryRepository;
    private final StoreRepository storeRepository;
    private final RequestValidator requestValidator;

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
