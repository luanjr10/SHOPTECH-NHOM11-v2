package com.shoptech.modules.order.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.util.Json;
import com.shoptech.modules.affiliate.service.AffiliateService;
import com.shoptech.modules.commission.service.CommissionService;
import com.shoptech.modules.coupon.entity.Coupon;
import com.shoptech.modules.coupon.service.CouponApplyService;
import com.shoptech.modules.installment.service.InstallmentService;
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
import com.shoptech.modules.tradein.service.TradeInService;
import com.shoptech.modules.xu.service.XuService;
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
 * phí ship GHN theo từng gian hàng, áp mã giảm giá (voucher gian hàng do gian hàng chịu, voucher sàn bị cắt trần
 * bằng hoa hồng), trừ ShopTech Xu, ghi nhận người giới thiệu affiliate theo từng dòng hàng và chốt tỉ lệ hoa hồng
 * tại thời điểm đặt. Chưa trừ kho ở bước này — kho chỉ trừ khi người bán bàn giao vận chuyển.
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
    private final XuService xuService;
    private final AffiliateService affiliateService;
    private final InstallmentService installmentService;
    private final TradeInService tradeInService;
    private final RequestValidator requestValidator;
    private final Json json;

    private record Line(Product product, String sku, BigDecimal unitPrice, int quantity, BigDecimal lineTotal,
                        AffiliateService.Attribution affiliate) {
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
                    quantity, unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP),
                    affiliateService.attribute(userId, product, item.affCode())));
        }

        BigDecimal productsSubtotal = groups.values().stream().flatMap(List::stream)
                .map(Line::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);

        ShippingService.Quote quote = shippingService.quoteCart(
                request.items().stream().map(i -> new ShippingService.Line(i.productId(), Math.max(1, i.quantity()))).toList(),
                request.districtId(), request.wardCode(), request.provinceId());
        BigDecimal totalShipping = BigDecimal.valueOf(quote.totalFee());

        // Tỉ lệ hoa hồng chốt theo từng gian hàng: một danh mục duy nhất thì theo danh mục, nhiều danh mục thì theo gian hàng.
        Map<Long, BigDecimal> rateByStore = new LinkedHashMap<>();
        List<CommissionService.Group> commissionGroups = new ArrayList<>();
        Map<Long, BigDecimal> storeSubtotals = new LinkedHashMap<>();
        Map<Long, BigDecimal> storeShippingFees = new LinkedHashMap<>();
        for (var entry : groups.entrySet()) {
            List<Integer> categoryIds = entry.getValue().stream().map(l -> l.product().getCategoryId()).distinct().toList();
            Integer categoryId = categoryIds.size() == 1 ? categoryIds.get(0) : null;
            BigDecimal subtotal = entry.getValue().stream().map(Line::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
            rateByStore.put(entry.getKey(), commissionService.resolveRate(entry.getKey(), categoryId));
            commissionGroups.add(new CommissionService.Group(entry.getKey(), subtotal, categoryId));
            storeSubtotals.put(entry.getKey(), subtotal);
            storeShippingFees.put(entry.getKey(), BigDecimal.valueOf(quote.feeFor(entry.getKey())));
        }
        BigDecimal commissionTotal = commissionService.estimateTotal(commissionGroups);

        CouponApplyService.Result applied = request.couponCode() == null || request.couponCode().isBlank() ? null
                : couponApplyService.apply(request.couponCode(), productsSubtotal, userId, totalShipping, commissionTotal,
                request.receiverPhone(), storeSubtotals, storeShippingFees);
        Coupon coupon = applied == null ? null : applied.coupon();
        BigDecimal discount = applied == null ? BigDecimal.ZERO : applied.discountAmount();
        boolean storeFunded = coupon != null && coupon.getStoreId() != null;
        BigDecimal platformDiscount = storeFunded ? BigDecimal.ZERO : discount;

        int xuUsed = 0;
        if (Boolean.TRUE.equals(request.useXu())) {
            BigDecimal productDiscount = coupon != null && !coupon.isFreeShip() ? discount : BigDecimal.ZERO;
            xuUsed = xuService.maxRedeemable(userId, productsSubtotal.subtract(productDiscount),
                    commissionTotal.subtract(platformDiscount));
        }

        Instant now = Instant.now();
        Order order = new Order();
        order.setUserId(userId);
        order.setStatus("pending");
        order.setTotalAmount(BigDecimal.ZERO);
        order.setShippingFee(totalShipping);
        order.setExpectedDeliveryTime(quote.expectedDeliveryTime());
        order.setPaymentMethod(request.paymentMethod());
        order.setDiscountCode(coupon == null ? null : coupon.getCode());
        order.setDiscountAmount(discount);
        order.setXuUsed(xuUsed);
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
            couponApplyService.redeem(coupon, userId, order.getId());
            tradeInService.markUsedByOrder(coupon, order.getId());
        }
        if (xuUsed > 0) {
            xuService.spendOnOrder(userId, order.getId(), xuUsed);
        }

        BigDecimal orderSubtotal = BigDecimal.ZERO;
        for (var entry : groups.entrySet()) {
            Store store = storeRepository.findById(entry.getKey())
                    .orElseThrow(() -> ApiException.unprocessable("Gian hàng #" + entry.getKey() + " không tồn tại"));
            List<Line> lines = entry.getValue();
            BigDecimal subtotal = lines.stream().map(Line::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
            boolean couponBelongsHere = storeFunded && store.getId().equals(coupon.getStoreId());

            SellerOrder so = new SellerOrder();
            so.setOrderId(order.getId());
            so.setStoreId(store.getId());
            so.setSellerProfileId(store.getSellerProfileId());
            so.setStatus("pending");
            so.setSubtotal(subtotal);
            so.setShippingFee(BigDecimal.valueOf(quote.feeFor(store.getId())));
            so.setCommissionRate(rateByStore.get(store.getId()));
            so.setCommissionAmount(BigDecimal.ZERO);
            so.setSellerAmount(BigDecimal.ZERO);
            so.setStoreDiscount(couponBelongsHere && !coupon.isFreeShip() ? discount : BigDecimal.ZERO);
            so.setStoreShippingSubsidy(couponBelongsHere && coupon.isFreeShip() ? discount : BigDecimal.ZERO);
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
                oi.setAffiliateReferrerId(line.affiliate() == null ? null : line.affiliate().referrerId());
                oi.setAffiliateRate(line.affiliate() == null ? null : line.affiliate().rate());
                oi.setCreatedAt(now);
                oi.setUpdatedAt(now);
                orderItemRepository.save(oi);
            }
            orderSubtotal = orderSubtotal.add(subtotal);
        }

        order.setTotalAmount(orderSubtotal.add(totalShipping).subtract(discount).subtract(BigDecimal.valueOf(xuUsed))
                .max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        orderRepository.save(order);

        if ("installment".equals(request.paymentMethod())) {
            installmentService.createRequest(order, userId, request.installmentMonths() == null ? 0 : request.installmentMonths());
        }
        return order;
    }
}
