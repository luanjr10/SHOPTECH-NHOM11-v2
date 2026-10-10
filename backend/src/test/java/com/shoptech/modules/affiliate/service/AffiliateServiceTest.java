package com.shoptech.modules.affiliate.service;

import com.shoptech.config.AppProperties;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.repository.OrderItemRepository;
import com.shoptech.modules.order.service.SellerOrderAmounts;
import com.shoptech.modules.payment.gateway.MomoGateway;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductImageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Affiliate theo sản phẩm: chỉ ghi nhận link hợp lệ và tính hoa hồng theo tỉ lệ đã chốt trên từng dòng hàng. */
class AffiliateServiceTest {

    private final NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
    private final OrderItemRepository items = mock(OrderItemRepository.class);
    private final SellerOrderAmounts amounts = mock(SellerOrderAmounts.class);
    private AffiliateService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        service = new AffiliateService(jdbc, items, amounts, mock(ProductImageRepository.class), mock(MomoGateway.class), mock(AppProperties.class));
        when(jdbc.query(anyString(), any(SqlParameterSource.class), any(RowMapper.class)))
                .thenReturn(List.of(new AffiliateService.Settings(true, BigDecimal.valueOf(2), 7, 50_000)));
    }

    private static Product product() {
        Product p = new Product();
        p.setId(11);
        p.setStoreId(1L);
        return p;
    }

    private void referrer(Long id) {
        when(jdbc.queryForList(anyString(), any(SqlParameterSource.class), eq(Long.class))).thenReturn(id == null ? List.of() : List.of(id));
    }

    private void productRate(String rate) {
        when(jdbc.queryForList(anyString(), any(SqlParameterSource.class), eq(BigDecimal.class)))
                .thenReturn(rate == null ? List.of() : List.of(new BigDecimal(rate)));
    }

    @Test
    void validLinkYieldsTheReferrerAndTheProductsRate() {
        referrer(10L);
        productRate("7.50");

        AffiliateService.Attribution a = service.attribute(99L, product(), "abcd1234");

        assertThat(a).isNotNull();
        assertThat(a.referrerId()).isEqualTo(10L);
        assertThat(a.rate()).isEqualByComparingTo("7.5");
    }

    @Test
    void youCannotEarnFromYourOwnPurchase() {
        referrer(10L);
        productRate("7.50");

        assertThat(service.attribute(10L, product(), "ABCD1234")).isNull();
    }

    @Test
    void unknownCodeOrProductWithoutAffiliateIsIgnored() {
        referrer(null);
        assertThat(service.attribute(99L, product(), "NOPE")).isNull();

        referrer(10L);
        productRate(null);
        assertThat(service.attribute(99L, product(), "ABCD1234")).isNull();
        assertThat(service.attribute(99L, product(), "  ")).isNull();
    }

    @Test
    void commissionUsesEachLinesLockedRateOnTheGoodsValueActuallyPaid() {
        SellerOrder so = new SellerOrder();
        so.setId(5L);
        so.setStoreId(1L);
        so.setSubtotal(BigDecimal.valueOf(1_500_000));
        OrderItem a = line(BigDecimal.valueOf(1_000_000), 10L, "3.00");
        OrderItem b = line(BigDecimal.valueOf(500_000), 10L, "10.00");
        OrderItem plain = line(BigDecimal.valueOf(2_000_000), null, null);
        when(items.findBySellerOrderIdOrderByIdAsc(5L)).thenReturn(List.of(a, b, plain));
        // khách được giảm 150.000 → chỉ trả 1.350.000 trên 1.500.000 giá niêm yết của phần đơn
        when(amounts.netProductAmount(so)).thenReturn(BigDecimal.valueOf(1_350_000));

        service.recordForCompletedOrder(so, 99L);

        ArgumentCaptor<SqlParameterSource> params = ArgumentCaptor.forClass(SqlParameterSource.class);
        verify(jdbc).update(anyString(), params.capture());
        // 900.000 × 3% + 450.000 × 10% = 27.000 + 45.000
        assertThat((BigDecimal) params.getValue().getValue("amount")).isEqualByComparingTo("72000");
        assertThat((BigDecimal) params.getValue().getValue("base")).isEqualByComparingTo("1350000");
        assertThat(params.getValue().getValue("ref")).isEqualTo(10L);
    }

    @Test
    void ordersWithoutReferredItemsPayNothing() {
        SellerOrder so = new SellerOrder();
        so.setId(6L);
        when(items.findBySellerOrderIdOrderByIdAsc(6L)).thenReturn(List.of(line(BigDecimal.TEN, null, null)));

        service.recordForCompletedOrder(so, 99L);

        verify(jdbc, never()).update(anyString(), any(SqlParameterSource.class));
    }

    private static OrderItem line(BigDecimal total, Long referrer, String rate) {
        OrderItem item = new OrderItem();
        item.setLineTotal(total);
        item.setAffiliateReferrerId(referrer);
        item.setAffiliateRate(rate == null ? null : new BigDecimal(rate));
        return item;
    }
}
