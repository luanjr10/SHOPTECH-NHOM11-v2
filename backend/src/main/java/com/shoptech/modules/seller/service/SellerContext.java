package com.shoptech.modules.seller.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.seller.repository.SellerProfileRepository;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * Seller Center: middleware seller.approved + store.owner.
 * Dùng trong @PreAuthorize: "@seller.approved()" cho route không gắn gian hàng,
 * "@seller.owns(#storeId)" cho route /api/seller/stores/{storeId}/...
 */
@Component("seller")
@RequiredArgsConstructor
public class SellerContext {

    private final AccessGuard access;
    private final SellerProfileRepository profileRepository;
    private final StoreRepository storeRepository;

    /** Người dùng hiện tại là seller có hồ sơ và không bị tạm ngưng. */
    public boolean approved() {
        profile();
        return true;
    }

    /** Như approved() và gian hàng phải tồn tại, thuộc về seller hiện tại. */
    public boolean owns(Long storeId) {
        store(storeId);
        return true;
    }

    public SellerProfile profile() {
        access.role("seller");
        SellerProfile profile = profileRepository.findByUserId(AccessGuard.currentUser().id())
                .orElseThrow(() -> ApiException.forbidden("Bạn chưa có hồ sơ người bán"));
        if ("suspended".equals(profile.getStatus())) {
            throw ApiException.forbidden("Tài khoản người bán chưa được duyệt hoặc đang bị tạm ngưng");
        }
        return profile;
    }

    public Store store(Long storeId) {
        SellerProfile profile = profile();
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy gian hàng"));
        if (!Objects.equals(store.getSellerProfileId(), profile.getId())) {
            throw ApiException.forbidden("Gian hàng này không thuộc về bạn");
        }
        return store;
    }
}
