package com.shoptech.modules.order.service;

import com.shoptech.modules.coupon.entity.Coupon;
import com.shoptech.modules.coupon.repository.CouponRepository;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Tiền của một phần đơn: hoa hồng tính trên hàng sau voucher gian hàng, người bán nhận phần còn lại trừ phí ship hỗ trợ. */
class SellerOrderAmountsTest {

    private final OrderRepository orders = mock(OrderRepository.class);
    private final SellerOrderRepository sellerOrders = mock(SellerOrderRepository.class);
    private final CouponRepository coupons = mock(CouponRepository.class);
    private SellerOrderAmounts amounts;

    @BeforeEach
    void setUp() {
        amounts = new SellerOrderAmounts(orders, sellerOrders, coupons);
    }

    private static SellerOrder part(long id, long orderId, double subtotal, double rate) {
        SellerOrder so = new SellerOrder();
        so.setId(id);
        so.setOrderId(orderId);
        so.setSubtotal(BigDecimal.valueOf(subtotal));
        so.setCommissionRate(BigDecimal.valueOf(rate));
        return so;
    }

    @Test
    void commissionIsChargedOnTheSubtotalAfterTheStoresOwnDiscount() {
        SellerOrder so = part(1, 1, 1_000_000, 10);
        so.setStoreDiscount(BigDecimal.valueOf(100_000));
        so.setStoreShippingSubsidy(BigDecimal.valueOf(20_000));

        assertThat(amounts.storeBase(so)).isEqualByComparingTo("900000");
        assertThat(amounts.commission(so)).isEqualByComparingTo("90000");
        // 900.000 − 90.000 − 20.000
        assertThat(amounts.sellerNet(so)).isEqualByComparingTo("790000");
    }

    @Test
    void platformVoucherAndXuAreSharedByTheSubtotalOfEachPart() {
        SellerOrder a = part(1, 7, 600_000, 10);
        SellerOrder b = part(2, 7, 400_000, 10);
        Order order = new Order();
        order.setId(7L);
        order.setDiscountCode("SAN50K");
        order.setDiscountAmount(BigDecimal.valueOf(50_000));
        order.setXuUsed(10_000);
        Coupon coupon = new Coupon();
        coupon.setFreeShip(false);
        when(orders.findById(7L)).thenReturn(Optional.of(order));
        when(coupons.findFirstByCodeIgnoreCase("SAN50K")).thenReturn(Optional.of(coupon));
        when(sellerOrders.findByOrderId(7L)).thenReturn(List.of(a, b));

        // (50.000 + 10.000) chia theo 60% / 40%
        assertThat(amounts.discountShare(a)).isEqualByComparingTo("36000");
        assertThat(amounts.discountShare(b)).isEqualByComparingTo("24000");
        assertThat(amounts.netProductAmount(a)).isEqualByComparingTo("564000");
    }

    @Test
    void freeShipVoucherDoesNotReduceTheGoodsValue() {
        SellerOrder so = part(1, 8, 500_000, 5);
        Order order = new Order();
        order.setId(8L);
        order.setDiscountCode("FREESHIP");
        order.setDiscountAmount(BigDecimal.valueOf(30_000));
        order.setXuUsed(0);
        Coupon coupon = new Coupon();
        coupon.setFreeShip(true);
        when(orders.findById(8L)).thenReturn(Optional.of(order));
        when(coupons.findFirstByCodeIgnoreCase("FREESHIP")).thenReturn(Optional.of(coupon));

        assertThat(amounts.discountShare(so)).isEqualByComparingTo("0");
        assertThat(amounts.netProductAmount(so)).isEqualByComparingTo("500000");
    }

    @Test
    void aStoreFundedVoucherIsNotSharedAgainAsAPlatformDiscount() {
        SellerOrder so = part(1, 9, 800_000, 10);
        so.setStoreDiscount(BigDecimal.valueOf(80_000));
        Order order = new Order();
        order.setId(9L);
        order.setDiscountCode("SHOP10");
        order.setDiscountAmount(BigDecimal.valueOf(80_000));
        order.setXuUsed(0);
        Coupon coupon = new Coupon();
        coupon.setStoreId(3L);
        when(orders.findById(9L)).thenReturn(Optional.of(order));
        when(coupons.findFirstByCodeIgnoreCase("SHOP10")).thenReturn(Optional.of(coupon));

        assertThat(amounts.discountShare(so)).isEqualByComparingTo("80000");
    }
}
