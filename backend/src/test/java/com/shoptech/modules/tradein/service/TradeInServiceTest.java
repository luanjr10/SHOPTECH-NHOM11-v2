package com.shoptech.modules.tradein.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.util.Json;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Giá thu cũ: giá gốc × hệ số tình trạng, cộng thưởng hộp/sạc, làm tròn đến nghìn đồng. */
class TradeInServiceTest {

    private final NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
    private TradeInService service;

    @BeforeEach
    void setUp() {
        service = new TradeInService(jdbc, mock(Json.class));
        when(jdbc.queryForList(anyString(), any(SqlParameterSource.class)))
                .thenReturn(List.of(Map.of("name", "iPhone 13 128GB", "base_price", BigDecimal.valueOf(10_000_000))));
    }

    @Test
    void goodConditionPaysEightyFivePercent() {
        Map<String, Object> estimate = service.estimate(1L, "good", false, false);

        assertThat((BigDecimal) estimate.get("estimated_price")).isEqualByComparingTo("8500000");
        assertThat(estimate.get("condition_label")).isEqualTo("Tốt");
    }

    @Test
    void boxAndChargerAddTwoAndOnePercentOfTheBasePrice() {
        Map<String, Object> estimate = service.estimate(1L, "like_new", true, true);

        // 10.000.000 + 200.000 + 100.000
        assertThat((BigDecimal) estimate.get("estimated_price")).isEqualByComparingTo("10300000");
        assertThat((BigDecimal) estimate.get("box_bonus")).isEqualByComparingTo("200000");
    }

    @Test
    void anUnknownConditionIsRejected() {
        assertThatThrownBy(() -> service.estimate(1L, "broken", false, false))
                .isInstanceOf(ApiException.class).hasMessageContaining("Tình trạng máy không hợp lệ");
    }
}
