package com.shoptech.modules.coupon.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.modules.coupon.entity.Coupon;
import com.shoptech.modules.coupon.repository.CouponRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Luật áp mã: voucher của gian hàng tính trên phần hàng của gian hàng đó; voucher sàn bị cắt trần bằng hoa hồng. */
class CouponApplyServiceTest {

    private final CouponRepository repository = mock(CouponRepository.class);
    private final NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
    private CouponApplyService service;

    @BeforeEach
    void setUp() {
        service = new CouponApplyService(repository, jdbc);
    }

    private Coupon percent(String code, double value, Long storeId) {
        Coupon c = new Coupon();
        c.setCode(code);
        c.setType("percent");
        c.setValue(BigDecimal.valueOf(value));
        c.setMinOrderAmount(BigDecimal.ZERO);
        c.setStoreId(storeId);
        c.setUsedCount(0);
        when(repository.findFirstByCodeIgnoreCase(code)).thenReturn(Optional.of(c));
        return c;
    }

    @Test
    void storeVoucherOnlyDiscountsTheSubtotalOfItsOwnStore() {
        percent("SHOP10", 10, 1L);

        CouponApplyService.Result result = service.apply("SHOP10", BigDecimal.valueOf(3_000_000), 5L, BigDecimal.ZERO,
                BigDecimal.valueOf(1), null, Map.of(1L, BigDecimal.valueOf(1_000_000), 2L, BigDecimal.valueOf(2_000_000)), Map.of());

        // 10% của 1.000.000 (chỉ phần hàng của gian hàng 1), không bị cắt trần vì do gian hàng chịu
        assertThat(result.discountAmount()).isEqualByComparingTo("100000");
        assertThat(result.capped()).isFalse();
    }

    @Test
    void storeVoucherIsRejectedWhenTheCartHasNothingFromThatStore() {
        percent("SHOP10", 10, 1L);
        when(jdbc.queryForList(anyString(), org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.namedparam.SqlParameterSource.class),
                org.mockito.ArgumentMatchers.eq(String.class))).thenReturn(java.util.List.of("TechZone"));

        assertThatThrownBy(() -> service.apply("SHOP10", BigDecimal.valueOf(2_000_000), 5L, BigDecimal.ZERO, null, null,
                Map.of(2L, BigDecimal.valueOf(2_000_000)), Map.of()))
                .isInstanceOf(ApiException.class).hasMessageContaining("TechZone");
    }

    @Test
    void platformVoucherIsCappedByTheCommissionTheOrderEarns() {
        percent("SAN20", 20, null);

        CouponApplyService.Result result = service.apply("SAN20", BigDecimal.valueOf(1_000_000), 5L, BigDecimal.ZERO,
                BigDecimal.valueOf(30_000), null, Map.of(), Map.of());

        assertThat(result.originalDiscount()).isEqualByComparingTo("200000");
        assertThat(result.discountAmount()).isEqualByComparingTo("30000");
        assertThat(result.capped()).isTrue();
    }

    @Test
    void storeFreeShipOnlyCoversThatStoresShippingFee() {
        Coupon c = percent("FSHOP", 0, 1L);
        c.setFreeShip(true);

        CouponApplyService.Result result = service.apply("FSHOP", BigDecimal.valueOf(2_000_000), 5L, BigDecimal.valueOf(60_000),
                null, null, Map.of(1L, BigDecimal.valueOf(1_000_000)), Map.of(1L, BigDecimal.valueOf(25_000), 2L, BigDecimal.valueOf(35_000)));

        assertThat(result.discountTarget()).isEqualTo("shipping");
        assertThat(result.discountAmount()).isEqualByComparingTo("25000");
    }

    @Test
    void aVoucherIssuedToOneUserCannotBeUsedByAnother() {
        Coupon c = percent("RIENG", 10, null);
        c.setUserId(9L);

        assertThatThrownBy(() -> service.apply("RIENG", BigDecimal.valueOf(500_000), 5L, BigDecimal.ZERO, null, null, Map.of(), Map.of()))
                .isInstanceOf(ApiException.class).hasMessageContaining("không dành cho tài khoản của bạn");
    }

    @Test
    void weekdayNumberingStartsAtSundayZero() {
        assertThat(CouponApplyService.weekdayLabel(0)).isEqualTo("Chủ Nhật");
        assertThat(CouponApplyService.weekdayLabel(1)).isEqualTo("Thứ 2");
        assertThat(CouponApplyService.weekdayLabel(6)).isEqualTo("Thứ 7");
        assertThat(CouponApplyService.todayWeekday()).isBetween(0, 6);
    }
}
