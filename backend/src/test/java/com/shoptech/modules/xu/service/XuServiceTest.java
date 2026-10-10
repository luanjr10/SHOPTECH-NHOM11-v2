package com.shoptech.modules.xu.service;

import com.shoptech.modules.order.service.SellerOrderAmounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Xu dùng được tối đa = min(số dư, 50% giá trị hàng sau voucher, phần hoa hồng sàn còn lại). */
class XuServiceTest {

    private final NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
    private XuService service;

    @BeforeEach
    void setUp() {
        service = new XuService(jdbc, mock(SellerOrderAmounts.class));
    }

    private void balance(int xu) {
        when(jdbc.queryForList(anyString(), any(SqlParameterSource.class), eq(Integer.class))).thenReturn(List.of(xu));
    }

    @Test
    void limitedByHalfOfTheGoodsValue() {
        balance(1_000_000);

        assertThat(service.maxRedeemable(1L, BigDecimal.valueOf(1_000_000), BigDecimal.valueOf(900_000))).isEqualTo(500_000);
    }

    @Test
    void limitedByTheCommissionTheOrderStillEarns() {
        balance(1_000_000);

        assertThat(service.maxRedeemable(1L, BigDecimal.valueOf(1_000_000), BigDecimal.valueOf(40_000))).isEqualTo(40_000);
    }

    @Test
    void limitedByTheBalanceTheCustomerOwns() {
        balance(120);

        assertThat(service.maxRedeemable(1L, BigDecimal.valueOf(1_000_000), BigDecimal.valueOf(100_000))).isEqualTo(120);
    }

    @Test
    void neverNegativeWhenTheCommissionIsAlreadyUsedUp() {
        balance(5_000);

        assertThat(service.maxRedeemable(1L, BigDecimal.valueOf(200_000), BigDecimal.valueOf(-15_000))).isZero();
    }
}
