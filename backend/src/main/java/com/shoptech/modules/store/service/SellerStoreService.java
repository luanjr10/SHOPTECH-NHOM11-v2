package com.shoptech.modules.store.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.common.util.Slugs;
import com.shoptech.modules.location.service.LocationService;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.store.dto.PickupAddressRequest;
import com.shoptech.modules.store.dto.StoreForm;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Gian hàng của seller: seller tạo → luôn "pending" chờ admin duyệt, seller không tự đổi trạng thái. */
@Service
@RequiredArgsConstructor
public class SellerStoreService {

    private final StoreRepository storeRepository;
    private final CloudinaryService cloudinaryService;
    private final RequestValidator requestValidator;
    private final LocationService locationService;

    @Transactional(readOnly = true)
    public List<Store> list(SellerProfile profile) {
        return storeRepository.findBySellerProfileId(profile.getId(), Sort.by("createdAt").descending());
    }

    @Transactional
    public Store create(SellerProfile profile, StoreForm form, MultipartFile logo) {
        validate(form, logo);

        Store store = new Store();
        store.setSellerProfileId(profile.getId());
        store.setName(form.name().trim());
        store.setSlug(uniqueSlug(form.name()));
        store.setLogo(hasFile(logo) ? cloudinaryService.uploadImage(logo) : null);
        store.setDescription(blankToNull(form.description()));
        store.setStatus("pending");
        store.setCreatedAt(Instant.now());
        store.setUpdatedAt(store.getCreatedAt());
        return storeRepository.saveAndFlush(store);
    }

    @Transactional
    public Store update(Store store, StoreForm form, MultipartFile logo) {
        validate(form, logo);

        store.setName(form.name().trim());
        store.setDescription(blankToNull(form.description()));
        if (hasFile(logo)) {
            store.setLogo(cloudinaryService.uploadImage(logo));
        }
        store.setUpdatedAt(Instant.now());
        return storeRepository.saveAndFlush(store);
    }

    /** Địa chỉ lấy hàng: mã quận/phường phải thuộc đúng tỉnh/quận đã chọn theo danh mục GHN. */
    @Transactional
    public Store updatePickupAddress(Store store, PickupAddressRequest request) {
        requestValidator.validate(request).throwIfFailed();

        Map<String, Object> province = locationService.findProvince(request.provinceId());
        Map<String, Object> district = province == null ? null
                : locationService.findDistrict(request.provinceId(), request.districtId());
        Map<String, Object> ward = district == null ? null
                : locationService.findWard(request.districtId(), request.wardCode());
        if (ward == null) {
            throw ApiException.unprocessable(
                    "Quận/huyện hoặc phường/xã không thuộc tỉnh/thành phố đã chọn, hoặc không tồn tại.");
        }

        store.setPickupContactName(request.pickupContactName().trim());
        store.setPickupPhone(request.pickupPhone());
        store.setAddressLine(request.addressLine().trim());
        store.setProvinceId(request.provinceId());
        store.setProvinceName(String.valueOf(province.get("ProvinceName")));
        store.setDistrictId(request.districtId());
        store.setDistrictName(String.valueOf(district.get("DistrictName")));
        store.setWardCode(request.wardCode());
        store.setWardName(String.valueOf(ward.get("WardName")));
        store.setUpdatedAt(Instant.now());
        return storeRepository.saveAndFlush(store);
    }

    private void validate(StoreForm form, MultipartFile logo) {
        Validator v = requestValidator.validate(form);
        if (hasFile(logo)) {
            ImageRules.check(v, List.of(logo), "logo", false, ImageRules.DEFAULT_EXT,
                    "Logo phải là hình ảnh",
                    "Logo phải có định dạng jpg, jpeg, png hoặc webp",
                    "Logo không được vượt quá 5MB");
        }
        v.throwIfFailed();
    }

    private String uniqueSlug(String name) {
        String base = Slugs.slug(name);
        String slug = base;
        for (int i = 2; storeRepository.existsBySlug(slug); i++) {
            slug = base + "-" + i;
        }
        return slug;
    }

    private static boolean hasFile(MultipartFile f) {
        return f != null && !f.isEmpty();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
