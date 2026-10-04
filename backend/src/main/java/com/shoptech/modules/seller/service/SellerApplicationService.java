package com.shoptech.modules.seller.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.category.entity.Category;
import com.shoptech.modules.category.repository.CategoryRepository;
import com.shoptech.modules.seller.dto.SellerApplicationResponse;
import com.shoptech.modules.seller.entity.SellerApplication;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.seller.entity.SellerWallet;
import com.shoptech.modules.seller.repository.SellerApplicationRepository;
import com.shoptech.modules.seller.repository.SellerProfileRepository;
import com.shoptech.modules.seller.repository.SellerWalletRepository;
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
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SellerApplicationService {

    private static final int PER_PAGE = 15;

    private final SellerApplicationRepository applicationRepository;
    private final SellerProfileRepository profileRepository;
    private final SellerWalletRepository walletRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final AppProperties props;

    @Transactional(readOnly = true)
    public PagedResult<SellerApplicationResponse> list(String status, Integer page, Integer perPage) {
        Page<SellerApplication> result = applicationRepository.search(
                status == null || status.isBlank() ? null : status,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()));
        List<SellerApplication> apps = result.getContent();

        Map<Long, UserSummary> users = users(apps.stream().map(SellerApplication::getUserId).toList());
        Map<Integer, String> categoryNames = categoryNames(apps);
        List<SellerApplicationResponse> content = apps.stream()
                .map(a -> SellerApplicationResponse.of(a, names(a, categoryNames), users.get(a.getUserId()), null))
                .toList();
        return PagedResult.of(new PageImpl<>(content, result.getPageable(), result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public SellerApplicationResponse detail(Long id) {
        return view(find(id));
    }

    /** Duyệt đơn: người dùng thành người bán, tạo hồ sơ người bán và ví (nếu chưa có). */
    @Transactional
    public SellerApplicationResponse approve(Long id, Long reviewerId) {
        SellerApplication app = findPending(id);
        app.setStatus(SellerApplication.APPROVED);
        app.setReviewedBy(reviewerId);
        app.setReviewedAt(Instant.now());

        User user = userRepository.findById(app.getUserId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng của đơn đăng ký"));
        user.setRole(User.ROLE_SELLER);

        SellerProfile profile = profileRepository.findByUserId(user.getId()).orElseGet(() -> {
            SellerProfile p = new SellerProfile();
            p.setUserId(user.getId());
            p.setDisplayName(app.getShopName());
            p.setPhone(app.getPhone());
            p.setStatus("active");
            return profileRepository.save(p);
        });
        if (!walletRepository.existsBySellerProfileId(profile.getId())) {
            SellerWallet wallet = new SellerWallet();
            wallet.setSellerProfileId(profile.getId());
            walletRepository.save(wallet);
        }
        applicationRepository.flush();
        return view(app);
    }

    @Transactional
    public SellerApplicationResponse reject(Long id, String reason, Long reviewerId) {
        if (reason != null && reason.trim().length() > 255) {
            throw ValidationException.of("reject_reason", "Lý do từ chối không được vượt quá 255 ký tự");
        }
        SellerApplication app = findPending(id);
        app.setStatus(SellerApplication.REJECTED);
        app.setRejectReason(reason == null || reason.isBlank() ? null : reason.trim());
        app.setReviewedBy(reviewerId);
        app.setReviewedAt(Instant.now());
        applicationRepository.flush();
        return view(app);
    }

    private SellerApplicationResponse view(SellerApplication app) {
        Map<Long, UserSummary> users = users(List.of(app.getUserId()));
        SellerApplicationResponse.Reviewer reviewer = app.getReviewedBy() == null ? null
                : userRepository.findById(app.getReviewedBy())
                .map(u -> new SellerApplicationResponse.Reviewer(u.getId(), u.getName())).orElse(null);
        return SellerApplicationResponse.of(app, names(app, categoryNames(List.of(app))), users.get(app.getUserId()), reviewer);
    }

    private SellerApplication findPending(Long id) {
        SellerApplication app = find(id);
        if (!SellerApplication.PENDING.equals(app.getStatus())) {
            throw ApiException.unprocessable("Đơn này đã được xử lý");
        }
        return app;
    }

    private SellerApplication find(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn đăng ký"));
    }

    private Map<Long, UserSummary> users(Collection<Long> ids) {
        return userRepository.findAllById(ids.stream().filter(Objects::nonNull).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(User::getId, u -> UserSummary.of(u, props)));
    }

    private Map<Integer, String> categoryNames(List<SellerApplication> apps) {
        Set<Integer> ids = new HashSet<>();
        apps.forEach(a -> {
            if (a.getCategoryIds() != null) {
                ids.addAll(a.getCategoryIds());
            }
        });
        return categoryRepository.findAllById(ids).stream().collect(Collectors.toMap(Category::getId, Category::getName));
    }

    private static List<String> names(SellerApplication app, Map<Integer, String> categoryNames) {
        if (app.getCategoryIds() == null) {
            return List.of();
        }
        return app.getCategoryIds().stream().map(categoryNames::get).filter(Objects::nonNull).toList();
    }
}
