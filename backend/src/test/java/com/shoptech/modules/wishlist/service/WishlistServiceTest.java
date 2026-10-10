package com.shoptech.modules.wishlist.service;

import com.shoptech.common.mail.MailService;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductImageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Báo giảm giá: chỉ gửi khi giá giảm thật, đạt mức mong muốn và chưa báo ở mức giá này. */
class WishlistServiceTest {

    private final NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
    private final MailService mail = mock(MailService.class);
    private WishlistService service;
    private Product product;

    @BeforeEach
    void setUp() {
        AppProperties props = mock(AppProperties.class);
        when(props.frontendUrl()).thenReturn("http://localhost:5175");
        service = new WishlistService(jdbc, mock(ProductImageRepository.class), mail, props);
        product = new Product();
        product.setId(7);
        product.setName("Tai nghe X");
        product.setSlug("tai-nghe-x");
    }

    private void watchers(Map<String, Object>... rows) {
        when(jdbc.queryForList(anyString(), any(SqlParameterSource.class))).thenReturn(List.of(rows));
    }

    private static Map<String, Object> watcher(long id, BigDecimal target, BigDecimal lastNotified) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", id);
        m.put("target_price", target);
        m.put("last_notified_price", lastNotified);
        m.put("email", "khach" + id + "@example.com");
        m.put("name", "Khách " + id);
        return m;
    }

    @Test
    void effectivePriceSubtractsTheDiscountPercent() {
        assertThat(WishlistService.effectivePrice(BigDecimal.valueOf(1_000_000), 15)).isEqualByComparingTo("850000");
    }

    @Test
    @SuppressWarnings("unchecked")
    void notifiesEveryoneWhenThePriceDropsAndNoTargetIsSet() {
        watchers(watcher(1, null, null), watcher(2, null, null));

        int sent = service.notifyWatchers(product, BigDecimal.valueOf(1_000_000), BigDecimal.valueOf(900_000));

        assertThat(sent).isEqualTo(2);
        verify(mail, times(2)).sendQuietly(anyString(), anyString(), anyString(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void staysQuietUntilTheTargetPriceIsReached() {
        watchers(watcher(1, BigDecimal.valueOf(800_000), null));

        assertThat(service.notifyWatchers(product, BigDecimal.valueOf(1_000_000), BigDecimal.valueOf(900_000))).isZero();
        verify(mail, never()).sendQuietly(anyString(), anyString(), anyString(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void doesNotRepeatTheSameOrAHigherPrice() {
        watchers(watcher(1, null, BigDecimal.valueOf(900_000)));

        assertThat(service.notifyWatchers(product, BigDecimal.valueOf(1_000_000), BigDecimal.valueOf(900_000))).isZero();
    }

    @Test
    void aPriceIncreaseNotifiesNobody() {
        assertThat(service.notifyWatchers(product, BigDecimal.valueOf(900_000), BigDecimal.valueOf(1_000_000))).isZero();
        verify(jdbc, never()).queryForList(anyString(), any(SqlParameterSource.class));
    }
}
