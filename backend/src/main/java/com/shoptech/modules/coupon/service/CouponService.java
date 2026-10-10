package com.shoptech.modules.coupon.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.modules.coupon.dto.CouponRequest;
import com.shoptech.modules.coupon.dto.CouponResponse;
import com.shoptech.modules.coupon.entity.Coupon;
import com.shoptech.modules.coupon.repository.CouponRepository;
import com.shoptech.modules.customer.service.CustomerTiers;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CouponService {

    private static final int PER_PAGE = 15;
    /** Ngày giờ không kèm múi giờ do admin nhập được hiểu theo giờ Việt Nam. */
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private final CouponRepository couponRepository;
    private final RequestValidator requestValidator;

    @Transactional(readOnly = true)
    public PagedResult<CouponResponse> list(Long storeId, String search, Integer page, Integer perPage) {
        Page<Coupon> result = couponRepository.searchByStore(storeId, search == null || search.isBlank() ? null : search.trim(),
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()));
        List<Long> ids = result.getContent().stream().map(Coupon::getId).toList();
        Map<Long, Long> claims = counts(ids.isEmpty() ? List.of() : couponRepository.countClaims(ids));
        Map<Long, Long> redemptions = counts(ids.isEmpty() ? List.of() : couponRepository.countRedemptions(ids));
        List<CouponResponse> content = result.getContent().stream()
                .map(c -> new CouponResponse(c, claims.getOrDefault(c.getId(), 0L), redemptions.getOrDefault(c.getId(), 0L)))
                .toList();
        return PagedResult.of(new PageImpl<>(content, result.getPageable(), result.getTotalElements()));
    }

    @Transactional
    public Coupon create(Long storeId, CouponRequest req) {
        Coupon coupon = new Coupon();
        coupon.setStoreId(storeId);
        apply(coupon, req, null);
        return couponRepository.saveAndFlush(coupon);
    }

    @Transactional
    public Coupon update(Long storeId, Long id, CouponRequest req) {
        Coupon coupon = find(storeId, id);
        apply(coupon, req, id);
        return couponRepository.saveAndFlush(coupon);
    }

    @Transactional
    public void delete(Long storeId, Long id) {
        couponRepository.delete(find(storeId, id));
    }

    private void apply(Coupon coupon, CouponRequest req, Long ignoreId) {
        Validator v = requestValidator.validate(req);
        String code = req.code() == null ? null : req.code().trim().toUpperCase(Locale.ROOT);
        if (!v.has("code") && (ignoreId == null ? couponRepository.existsByCode(code)
                : couponRepository.existsByCodeAndIdNot(code, ignoreId))) {
            v.add("code", "Mã voucher đã tồn tại");
        }
        if (req.targetTier() != null && !req.targetTier().isBlank()
                && CustomerTiers.TIERS.stream().noneMatch(t -> t.key().equals(req.targetTier()))) {
            v.add("target_tier", "Hạng khách hàng không hợp lệ");
        }
        if (!"free_ship".equals(req.type()) && req.value() == null && !v.has("value")) {
            v.add("value", "Vui lòng nhập giá trị giảm");
        }
        Instant expiresAt = null;
        if (req.expiresAt() != null && !req.expiresAt().isBlank()) {
            expiresAt = parseDate(req.expiresAt().trim());
            if (expiresAt == null) {
                v.add("expires_at", "Ngày hết hạn không hợp lệ");
            }
        }
        v.throwIfFailed();

        coupon.setCode(code);
        coupon.setTitle(blankToNull(req.title()));
        coupon.setDescription(blankToNull(req.description()));
        coupon.setType(req.type());
        coupon.setTargetTier(blankToNull(req.targetTier()));
        coupon.setNewCustomerOnly(Boolean.TRUE.equals(req.newCustomerOnly()));
        coupon.setWeekday(req.weekday());
        coupon.setDailyLimit(req.dailyLimit());
        coupon.setFreeShip("free_ship".equals(req.type()));
        coupon.setValue(req.value() == null ? BigDecimal.ZERO : req.value());
        coupon.setMaxDiscount(req.maxDiscount());
        coupon.setMinOrderAmount(req.minOrderAmount() == null ? BigDecimal.ZERO : req.minOrderAmount());
        coupon.setUsageLimit(req.usageLimit());
        coupon.setPerUserLimit(req.perUserLimit());
        coupon.setExpiresAt(expiresAt);
        coupon.setActive(req.isActive() == null || req.isActive());
    }

    /** Chỉ thao tác được voucher do chính gian hàng phát hành. */
    private Coupon find(Long storeId, Long id) {
        return couponRepository.findById(id)
                .filter(c -> storeId.equals(c.getStoreId()) && c.getTradeInRequestId() == null)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy voucher"));
    }

    /** Nhận ISO có múi giờ, "yyyy-MM-ddTHH:mm[:ss]", "yyyy-MM-dd HH:mm[:ss]" hoặc chỉ ngày (hết ngày đó). */
    private static Instant parseDate(String value) {
        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (DateTimeParseException ignored) {
            // thử định dạng khác
        }
        for (String pattern : List.of("yyyy-MM-dd'T'HH:mm[:ss]", "yyyy-MM-dd HH:mm[:ss]")) {
            try {
                return LocalDateTime.parse(value, DateTimeFormatter.ofPattern(pattern)).atZone(VN).toInstant();
            } catch (DateTimeParseException ignored) {
                // thử định dạng khác
            }
        }
        try {
            return LocalDate.parse(value).atTime(23, 59, 59).atZone(VN).toInstant();
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static Map<Long, Long> counts(List<Object[]> rows) {
        Map<Long, Long> out = new HashMap<>();
        rows.forEach(r -> out.put(((Number) r[0]).longValue(), ((Number) r[1]).longValue()));
        return out;
    }
}
