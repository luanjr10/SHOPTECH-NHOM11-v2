package com.shoptech.modules.order.service;

import com.shoptech.modules.coupon.entity.Coupon;
import com.shoptech.modules.coupon.repository.CouponRepository;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Cách tính tiền của một phần đơn (seller_order): giá trị hàng tính hoa hồng, phần người bán thực nhận
 * và phần giảm giá (voucher sàn + xu + voucher gian hàng) được chia theo tỉ lệ tạm tính.
 */
@Component
@RequiredArgsConstructor
public class SellerOrderAmounts {

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final CouponRepository couponRepository;

    /** Tạm tính trừ phần giảm do chính gian hàng chịu — nền tính hoa hồng sàn. */
    public BigDecimal storeBase(SellerOrder so) {
        return nz(so.getSubtotal()).subtract(nz(so.getStoreDiscount())).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal commission(SellerOrder so) {
        return storeBase(so).multiply(nz(so.getCommissionRate())).movePointLeft(2).setScale(2, RoundingMode.HALF_UP);
    }

    /** Tiền người bán thực nhận: hàng sau giảm của gian hàng, trừ hoa hồng sàn và phí ship gian hàng hỗ trợ. */
    public BigDecimal sellerNet(SellerOrder so) {
        return storeBase(so).subtract(commission(so)).subtract(nz(so.getStoreShippingSubsidy()))
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Phần giảm giá hàng (voucher sàn + xu) chia theo tỉ lệ tạm tính, cộng voucher do gian hàng chịu.
     * Voucher miễn ship không làm giảm giá trị hàng nên không tính.
     */
    public BigDecimal discountShare(SellerOrder so) {
        Order order = orderRepository.findById(so.getOrderId()).orElse(null);
        BigDecimal shared = BigDecimal.ZERO;
        if (order != null) {
            if (nz(order.getDiscountAmount()).signum() > 0 && order.getDiscountCode() != null) {
                Coupon coupon = couponRepository.findFirstByCodeIgnoreCase(order.getDiscountCode()).orElse(null);
                if (coupon != null && !coupon.isFreeShip() && coupon.getStoreId() == null) {
                    shared = shared.add(order.getDiscountAmount());
                }
            }
            shared = shared.add(BigDecimal.valueOf(order.getXuUsed() == null ? 0 : order.getXuUsed()));
        }

        BigDecimal share = BigDecimal.ZERO;
        if (shared.signum() > 0) {
            List<SellerOrder> parts = sellerOrderRepository.findByOrderId(so.getOrderId());
            BigDecimal productsTotal = parts.stream().map(p -> nz(p.getSubtotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (productsTotal.signum() > 0) {
                share = shared.multiply(nz(so.getSubtotal())).divide(productsTotal, 2, RoundingMode.HALF_UP);
            }
        }
        return share.add(nz(so.getStoreDiscount())).setScale(2, RoundingMode.HALF_UP);
    }

    /** Giá trị hàng khách thực trả (dùng tính xu thưởng và hoa hồng affiliate). */
    public BigDecimal netProductAmount(SellerOrder so) {
        return nz(so.getSubtotal()).subtract(discountShare(so)).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
