package com.shoptech.modules.seller.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.modules.category.repository.CategoryRepository;
import com.shoptech.modules.seller.dto.SellerApplicationForm;
import com.shoptech.modules.seller.entity.SellerApplication;
import com.shoptech.modules.seller.repository.SellerApplicationRepository;
import com.shoptech.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/** Khách đăng ký trở thành người bán; admin duyệt ở SellerApplicationService. */
@Service
@RequiredArgsConstructor
public class CustomerSellerApplicationService {

    private final SellerApplicationRepository applicationRepository;
    private final CategoryRepository categoryRepository;
    private final RequestValidator requestValidator;

    @Transactional
    public SellerApplication submit(User user, SellerApplicationForm form) {
        if (User.ROLE_SELLER.equals(user.getRole())) {
            throw ApiException.unprocessable("Bạn đã là người bán");
        }
        if (applicationRepository.existsByUserIdAndStatus(user.getId(), SellerApplication.PENDING)) {
            throw ApiException.unprocessable("Bạn đã có đơn đăng ký đang chờ duyệt");
        }

        Validator v = requestValidator.validate(form);
        if (!v.has("category_ids") && form.categoryIds().stream()
                .anyMatch(id -> id == null || !categoryRepository.existsById(id))) {
            v.add("category_ids", "Danh mục được chọn không hợp lệ");
        }
        v.throwIfFailed();

        SellerApplication application = new SellerApplication();
        application.setUserId(user.getId());
        application.setShopName(form.shopName().trim());
        application.setPhone(blankToNull(form.phone()));
        application.setAddress(blankToNull(form.address()));
        application.setCategoryIds(form.categoryIds().stream().distinct().toList());
        application.setStatus(SellerApplication.PENDING);
        application.setCreatedAt(Instant.now());
        application.setUpdatedAt(application.getCreatedAt());
        return applicationRepository.save(application);
    }

    @Transactional(readOnly = true)
    public List<SellerApplication> mine(Long userId) {
        return applicationRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
