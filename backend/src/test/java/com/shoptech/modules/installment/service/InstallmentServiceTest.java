package com.shoptech.modules.installment.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Lịch trả góp: lãi phẳng theo tháng, kỳ cuối nhận phần dư nên tổng các kỳ luôn khớp tuyệt đối. */
class InstallmentServiceTest {

    private final InstallmentService service = new InstallmentService(null, null, null, null, null, null);

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> schedule(Map<String, Object> quote) {
        return (List<Map<String, Object>>) quote.get("schedule");
    }

    @Test
    void zeroInterestSplitsPrincipalEvenly() {
        Map<String, Object> quote = service.quote(BigDecimal.valueOf(9_000_000), 3, 0.0);

        assertThat(quote.get("total_interest")).isEqualTo(BigDecimal.ZERO);
        assertThat(quote.get("total_payable")).isEqualTo(BigDecimal.valueOf(9_000_000));
        assertThat(schedule(quote)).extracting(row -> row.get("amount"))
                .containsExactly(BigDecimal.valueOf(3_000_000), BigDecimal.valueOf(3_000_000), BigDecimal.valueOf(3_000_000));
    }

    @Test
    void flatInterestIsChargedPerMonthOnThePrincipal() {
        Map<String, Object> quote = service.quote(BigDecimal.valueOf(22_000_000), 6, 0.8);

        // 22.000.000 × 0,8% × 6 tháng = 1.056.000
        assertThat(quote.get("total_interest")).isEqualTo(BigDecimal.valueOf(1_056_000));
        assertThat(quote.get("total_payable")).isEqualTo(BigDecimal.valueOf(23_056_000));
    }

    @Test
    void lastInstalmentAbsorbsRoundingSoTheSumMatchesExactly() {
        Map<String, Object> quote = service.quote(BigDecimal.valueOf(10_000_001), 3, 1.2);

        BigDecimal paid = schedule(quote).stream().map(row -> (BigDecimal) row.get("amount")).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal principal = schedule(quote).stream().map(row -> (BigDecimal) row.get("principal_part")).reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(paid).isEqualTo(quote.get("total_payable"));
        assertThat(principal).isEqualTo(BigDecimal.valueOf(10_000_001));
        assertThat(schedule(quote)).hasSize(3);
        assertThat(schedule(quote)).extracting(row -> row.get("number")).containsExactly(1, 2, 3);
    }
}
