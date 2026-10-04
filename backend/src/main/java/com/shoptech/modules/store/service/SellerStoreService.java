package com.shoptech.modules.store.service;

import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.common.util.Slugs;
import com.shoptech.modules.seller.entity.SellerProfile;
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

/** Gian hàng của seller: seller tạo → luôn "pending" chờ admin duyệt, seller không tự đổi trạng thái. */
@Service
@RequiredArgsConstructor
public class SellerStoreService {

    private final StoreRepository storeRepository;
    private final CloudinaryService cloudinaryService;
    private final RequestValidator requestValidator;

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
