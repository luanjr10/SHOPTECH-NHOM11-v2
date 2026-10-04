package com.shoptech.modules.customer.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.customer.service.CustomerTiers;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

/** Hạng thành viên của khách đang đăng nhập (hiển thị ở trang Tài khoản). */
@RestController
@RequestMapping("/api/loyalty")
@RequiredArgsConstructor
public class LoyaltyController {

    private final JdbcTemplate jdbc;

    public record Summary(String tier, String tierLabel, String tierColor, BigDecimal totalSpent,
                          CustomerTiers.NextTier nextTier, List<CustomerTiers.Tier> tiers) {
    }

    @GetMapping("/summary")
    public ApiResponse<Summary> summary() {
        BigDecimal totalSpent = jdbc.queryForObject(
                "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = ? AND status = ?",
                BigDecimal.class, AccessGuard.currentUser().id(), CustomerTiers.COUNTED_STATUS);
        BigDecimal spent = totalSpent == null ? BigDecimal.ZERO : totalSpent;
        CustomerTiers.Tier tier = CustomerTiers.resolve(spent);
        return ApiResponse.ok(new Summary(tier.key(), tier.label(), tier.color(), spent,
                CustomerTiers.next(spent), CustomerTiers.TIERS));
    }
}
