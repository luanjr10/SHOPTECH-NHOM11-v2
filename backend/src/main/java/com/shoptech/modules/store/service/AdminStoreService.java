package com.shoptech.modules.store.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.seller.repository.SellerProfileRepository;
import com.shoptech.modules.store.dto.AdminStoreResponse;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import com.shoptech.modules.user.dto.UserSummary;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminStoreService {

    private static final int PER_PAGE = 15;
    private static final Set<String> ADMIN_STATUSES = Set.of("active", "inactive");

    private final StoreRepository storeRepository;
    private final SellerProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final AppProperties props;

    @Transactional(readOnly = true)
    public PagedResult<AdminStoreResponse> list(String status, Integer page, Integer perPage) {
        Page<Store> result = storeRepository.search(status == null || status.isBlank() ? null : status,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()));
        List<Store> stores = result.getContent();
        List<Long> ids = stores.stream().map(Store::getId).toList();

        Map<Long, Long> productCounts = new HashMap<>();
        if (!ids.isEmpty()) {
            storeRepository.countProducts(ids)
                    .forEach(r -> productCounts.put(((Number) r[0]).longValue(), ((Number) r[1]).longValue()));
        }
        Map<Long, SellerProfile> profiles = profileRepository.findAllById(stores.stream()
                        .map(Store::getSellerProfileId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(SellerProfile::getId, p -> p));
        Map<Long, UserSummary> users = userRepository.findAllById(profiles.values().stream()
                        .map(SellerProfile::getUserId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, u -> UserSummary.of(u, props)));

        List<AdminStoreResponse> content = stores.stream().map(s -> {
            SellerProfile p = profiles.get(s.getSellerProfileId());
            var owner = p == null ? null : new AdminStoreResponse.Owner(p, users.get(p.getUserId()));
            return new AdminStoreResponse(s, productCounts.getOrDefault(s.getId(), 0L), owner);
        }).toList();
        return PagedResult.of(new PageImpl<>(content, result.getPageable(), result.getTotalElements()));
    }

    /** Admin chỉ bật/tắt gian hàng (active/inactive); duyệt gian hàng mới cũng là chuyển sang active. */
    @Transactional
    public Store updateStatus(Long id, String status) {
        if (status == null || !ADMIN_STATUSES.contains(status)) {
            throw ValidationException.of("status", "Trạng thái không hợp lệ");
        }
        Store store = storeRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy gian hàng"));
        store.setStatus(status);
        store.setUpdatedAt(Instant.now());
        return storeRepository.saveAndFlush(store);
    }
}
