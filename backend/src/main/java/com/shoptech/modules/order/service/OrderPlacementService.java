package com.shoptech.modules.order.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.util.Json;
import com.shoptech.modules.commission.service.CommissionService;
import com.shoptech.modules.coupon.service.CouponApplyService;
import com.shoptech.modules.order.dto.PlaceOrderRequest;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.repository.OrderItemRepository;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import com.shoptech.modules.product.document.ProductSpecification;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.product.repository.ProductSpecificationRepository;
import com.shoptech.modules.product.service.ProductPricing;
import com.shoptech.modules.shipping.service.ShippingService;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Đặt hàng: tách đơn theo gian hàng (mỗi gian hàng một seller_order), tính giá theo biến thể hiện tại,
 * phí ship GHN theo từng gian hàng, áp mã giảm giá và chốt tỉ lệ hoa hồng tại thời điểm đặt.
 * Chưa trừ kho ở bước này — kho chỉ trừ khi người bán bàn giao vận chuyển.
 */
@Service
@RequiredArgsConstructor
public class OrderPlacementService {

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final ProductSpecificationRepository specificationRepository;
    private final StoreRepository storeRepository;
    private final ShippingService shippingService;
    private final CouponApplyService couponApplyService;
    private final CommissionService commissionService;
    private final RequestValidator requestValidator;
    private final Json json;

    private record Line(Product product, String sku, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {
    }

    @Transactional
    public Order place(Long userId, PlaceOrderRequest request) {
        requestValidator.validate(request).throwIfFailed();

        // Gom dòng theo gian hàng, khoá sản phẩm để kiểm tra tồn kho nhất quán.
        Map<Long, List<Line>> groups = new LinkedHashMap<>();
        for (PlaceOrderRequest.Item item : request.items()) {
            Product product = productRepository.findByIdForUpdate(item.productId())
                    .orElseThrow(() -> ApiException.unprocessable("Sản phẩm #" + item.productId() + " không tồn tại"));
            if (product.getStoreId() == null) {
                throw ApiException.unprocessable("Sản phẩm '" + product.getName() + "' không thuộc gian hàng nào");
            }
            String sku = item.sku() == null || item.sku().isBlank() ? null : item.sku().trim();
            List<Map<String, Object>> variants = specificationRepository.findFirstByProductId(product.getId())
                    .map(ProductSpecification::getVariants).map(json::mapListOf).orElse(List.of());
            BigDecimal unitPrice = ProductPricing.unitPrice(product, variants, sku);
            int available = ProductPricing.stock(product, variants, sku);
            int quantity = Math.max(1, item.quantity());
            if (quantity > available) {
                throw ApiException.unprocessable("Sản phẩm '" + product.getName() + "' chỉ còn " + available + " trong kho");
            }
            groups.computeIfAbsent(product.getStoreId(), k -> new ArrayList<>()).add(new Line(product, sku, unitPrice,
                    quantity, unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP)));
        }

        BigDecimal productsSubtotal = groups.values().stream().flatMap(List::stream)
                .map(Line::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);

        ShippingService.Quote quote = shippingService.quoteCart(
                request.items().stream().map(i -> new ShippingService.Line(i.productId(), Math.max(1, i.quantity()))).toList(),
                request.districtId(), request.wardCode(), request.provinceId());
        BigDecimal totalShipping = BigDecimal.valueOf(quote.totalFee());

        CouponApplyService.Result coupon = request.couponCode() == null || request.couponCode().isBlank() ? null
                : couponApplyService.apply(request.couponCode(), productsSubtotal, userId, totalShipping);
        BigDecimal discount = coupon == null ? BigDecimal.ZERO : coupon.discountAmount();

        Instant now = Instant.now();
        Order order = new Order();
        order.setUserId(userId);
        order.setStatus("pending");
        order.setTotalAmount(BigDecimal.ZERO);
        order.setShippingFee(totalShipping);
        order.setExpectedDeliveryTime(quote.expectedDeliveryTime());
        order.setPaymentMethod(request.paymentMethod());
        order.setDiscountCode(coupon == null ? null : coupon.coupon().getCode());
        order.setDiscountAmount(discount);
        order.setReceiverName(request.receiverName().trim());
        order.setReceiverPhone(request.receiverPhone());
        order.setShippingAddress(request.shippingAddress().trim());
        order.setGhnProvinceId(request.provinceId());
        order.setGhnProvinceName(request.provinceName());
        order.setGhnDistrictId(request.districtId());
        order.setGhnDistrictName(request.districtName());
        order.setGhnWardCode(request.wardCode());
        order.setGhnWardName(request.wardName());
        order.setCreatedAt(now);
        order.setUpdatedAt(now);
        orderRepository.saveAndFlush(order);

        if (coupon != null) {
            couponApplyService.redeem(coupon.coupon(), userId, order.getId());
        }

        BigDecimal orderSubtotal = BigDecimal.ZERO;
        for (var entry : groups.entrySet()) {
            Store store = storeRepository.findById(entry.getKey())
                    .orElseThrow(() -> ApiException.unprocessable("Gian hàng #" + entry.getKey() + " không tồn tại"));
            List<Line> lines = entry.getValue();
            BigDecimal subtotal = lines.stream().map(Line::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
            // Một danh mục duy nhất thì áp tỉ lệ theo danh mục, nhiều danh mục thì theo gian hàng / mặc định.
            List<Integer> categoryIds = lines.stream().map(l -> l.product().getCategoryId()).distinct().toList();
            BigDecimal rate = commissionService.resolveRate(store.getId(), categoryIds.size() == 1 ? categoryIds.get(0) : null);

            SellerOrder so = new SellerOrder();
            so.setOrderId(order.getId());
            so.setStoreId(store.getId());
            so.setSellerProfileId(store.getSellerProfileId());
            so.setStatus("pending");
            so.setSubtotal(subtotal);
            so.setShippingFee(BigDecimal.valueOf(quote.feeFor(store.getId())));
            so.setCommissionRate(rate);
            so.setCommissionAmount(BigDecimal.ZERO);
            so.setSellerAmount(BigDecimal.ZERO);
            so.setCreatedAt(now);
            so.setUpdatedAt(now);
            sellerOrderRepository.saveAndFlush(so);

            for (Line line : lines) {
                OrderItem oi = new OrderItem();
                oi.setSellerOrderId(so.getId());
                oi.setProductId(line.product().getId());
                oi.setProductName(line.product().getName());
                oi.setSku(line.sku());
                oi.setUnitPrice(line.unitPrice());
                oi.setQuantity(line.quantity());
                oi.setLineTotal(line.lineTotal());
                oi.setCreatedAt(now);
                oi.setUpdatedAt(now);
                orderItemRepository.save(oi);
            }
            orderSubtotal = orderSubtotal.add(subtotal);
        }

        order.setTotalAmount(orderSubtotal.add(totalShipping).subtract(discount).max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP));
        return orderRepository.save(order);
    }
}
