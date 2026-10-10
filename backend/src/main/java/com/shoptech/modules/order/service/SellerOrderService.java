package com.shoptech.modules.order.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.modules.affiliate.service.AffiliateService;
import com.shoptech.modules.coupon.entity.Coupon;
import com.shoptech.modules.coupon.repository.CouponRepository;
import com.shoptech.modules.installment.service.InstallmentService;
import com.shoptech.modules.inventory.service.StockService;
import com.shoptech.modules.tradein.service.TradeInService;
import com.shoptech.modules.xu.service.XuService;
import com.shoptech.modules.order.dto.Invoice;
import com.shoptech.modules.order.dto.SellerOrderView;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.entity.Shipment;
import com.shoptech.modules.order.repository.OrderItemRepository;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import com.shoptech.modules.order.repository.ShipmentRepository;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.withdrawal.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Đơn hàng của gian hàng (Seller Center). Vòng đời một phần đơn:
 * pending → confirmed → shipping (bàn giao: trừ kho + giữ tiền vào ví) → delivered → completed (khách xác nhận),
 * có thể huỷ trước khi giao xong (đang giao thì hoàn kho + bỏ tiền đã giữ).
 * Không tích hợp hãng vận chuyển: người bán tự giao và tự đánh dấu đã giao / giao thất bại.
 */
@Service
@RequiredArgsConstructor
public class SellerOrderService {

    private static final int PER_PAGE = 15;
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "pending", Set.of("confirmed", "cancelled"),
            "confirmed", Set.of("shipping", "cancelled"),
            "shipping", Set.of("delivered", "cancelled", "completed"),
            "delivered", Set.of("completed"),
            "completed", Set.of(),
            "cancelled", Set.of());

    private final SellerOrderRepository sellerOrderRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShipmentRepository shipmentRepository;
    private final StockService stockService;
    private final WalletService walletService;
    private final OrderViewService orderViewService;
    private final InvoiceService invoiceService;
    private final SellerOrderAmounts amounts;
    private final CouponRepository couponRepository;
    private final XuService xuService;
    private final AffiliateService affiliateService;
    private final InstallmentService installmentService;
    private final TradeInService tradeInService;

    // ------------------------------------------------------------------ đọc

    @Transactional(readOnly = true)
    public PagedResult<SellerOrderView> list(Store store, String status, Integer page, Integer perPage) {
        Page<SellerOrder> result = sellerOrderRepository.searchByStore(store.getId(),
                status == null || status.isBlank() ? null : status,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending().and(Sort.by("id").descending())));
        List<SellerOrder> rows = result.getContent();
        List<Long> ids = rows.stream().map(SellerOrder::getId).toList();

        Map<Long, List<OrderItem>> items = ids.isEmpty() ? Map.of()
                : orderItemRepository.findBySellerOrderIdInOrderByIdAsc(ids).stream()
                .collect(Collectors.groupingBy(OrderItem::getSellerOrderId));
        Map<Long, Shipment> shipments = ids.isEmpty() ? Map.of()
                : shipmentRepository.findBySellerOrderIdIn(ids).stream()
                .collect(Collectors.toMap(Shipment::getSellerOrderId, Function.identity(), (a, b) -> a));
        Map<Long, Order> orders = orderRepository.findAllById(rows.stream().map(SellerOrder::getOrderId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Order::getId, Function.identity()));

        List<SellerOrderView> content = rows.stream().map(so -> SellerOrderView.of(so,
                items.getOrDefault(so.getId(), List.of()), orders.get(so.getOrderId()), shipments.get(so.getId()))).toList();
        return PagedResult.of(new PageImpl<>(content, result.getPageable(), result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public SellerOrderView detail(Store store, Long id) {
        return view(find(store, id));
    }

    // ------------------------------------------------------------------ đổi trạng thái

    /** Người bán chỉ tự xác nhận hoặc huỷ đơn. */
    @Transactional
    public SellerOrderView updateStatus(Store store, Long id, String status) {
        if (!"confirmed".equals(status) && !"cancelled".equals(status)) {
            throw ValidationException.of("status", "Trạng thái không hợp lệ");
        }
        SellerOrder so = lock(store, id);
        assertTransition(so.getStatus(), status);
        if ("confirmed".equals(status) && installmentService.isInstallmentOrder(so.getOrderId())
                && !orderRepository.findById(so.getOrderId()).map(o -> "paid".equals(o.getStatus())).orElse(false)) {
            throw ApiException.unprocessable("Đơn trả góp chỉ xác nhận được sau khi bạn duyệt khoản vay và khách đã thanh toán kỳ 1.");
        }
        if ("cancelled".equals(status)) {
            cancel(so);
        } else {
            setStatus(so, status);
        }
        syncParentOrderStatus(so);
        return view(so);
    }

    /** Bàn giao vận chuyển: trừ kho, giữ phần thực nhận vào ví, tạo vận đơn tự giao. */
    @Transactional
    public SellerOrderView handover(Store store, Long id) {
        SellerOrder so = lock(store, id);
        assertTransition(so.getStatus(), "shipping");
        if (shipmentRepository.findFirstBySellerOrderId(so.getId()).isPresent()) {
            throw ApiException.unprocessable("Đơn hàng đã bàn giao vận chuyển rồi.");
        }

        for (OrderItem item : orderItemRepository.findBySellerOrderIdOrderByIdAsc(so.getId())) {
            stockService.decrement(item.getProductId(), item.getSku(), qty(item), item.getProductName());
        }
        if (!installmentService.isInstallmentOrder(so.getOrderId())) {
            walletService.holdForOrder(so.getSellerProfileId(), amounts.sellerNet(so), so.getId());
        }

        Order order = orderRepository.findById(so.getOrderId()).orElse(null);
        Instant now = Instant.now();
        Shipment shipment = new Shipment();
        shipment.setSellerOrderId(so.getId());
        shipment.setProvider("self");
        shipment.setFee(so.getShippingFee());
        shipment.setCodAmount(codAmount(order, so));
        shipment.setStatus("shipping");
        shipment.setExpectedDeliveryTime(order == null ? null : order.getExpectedDeliveryTime());
        shipment.setShippedAt(now);
        shipment.setCreatedAt(now);
        shipment.setUpdatedAt(now);
        shipmentRepository.save(shipment);

        setStatus(so, "shipping");
        syncParentOrderStatus(so);
        return view(so);
    }

    /** Người bán (tự giao) báo đã giao thành công — chờ khách xác nhận để hoàn tất và nhận tiền. */
    @Transactional
    public SellerOrderView markDeliveredByDriver(Store store, Long id) {
        SellerOrder so = lock(store, id);
        assertTransition(so.getStatus(), "delivered");
        shipmentRepository.findFirstBySellerOrderId(so.getId()).ifPresent(s -> {
            s.setStatus("delivered");
            s.setDeliveredAt(Instant.now());
            s.setUpdatedAt(Instant.now());
            shipmentRepository.save(s);
        });
        setStatus(so, "delivered");
        syncParentOrderStatus(so);
        return view(so);
    }

    /** Giao thất bại / khách không nhận: huỷ đơn, vận đơn chuyển "returned". */
    @Transactional
    public SellerOrderView markCancelledByDriver(Store store, Long id) {
        SellerOrder so = lock(store, id);
        if (!"confirmed".equals(so.getStatus()) && !"shipping".equals(so.getStatus())) {
            throw ApiException.unprocessable("Không thể hủy đơn từ trạng thái '" + so.getStatus() + "'.");
        }
        shipmentRepository.findFirstBySellerOrderId(so.getId()).ifPresent(s -> {
            s.setStatus("returned");
            s.setUpdatedAt(Instant.now());
            shipmentRepository.save(s);
        });
        cancel(so);
        syncParentOrderStatus(so);
        return view(so);
    }

    /**
     * Khách xác nhận đã nhận hàng (đang giao / đã giao → hoàn tất): chốt hoa hồng theo tỉ lệ đã snapshot,
     * chuyển tiền thực nhận sang "có thể rút". Quyền sở hữu đơn do phía khách kiểm tra trước khi gọi.
     */
    @Transactional
    public SellerOrder completeByCustomer(Long sellerOrderId) {
        SellerOrder so = sellerOrderRepository.findByIdForUpdate(sellerOrderId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
        assertTransition(so.getStatus(), "completed");

        BigDecimal commission = amounts.commission(so);
        BigDecimal sellerAmount = amounts.sellerNet(so);
        so.setCommissionAmount(commission);
        so.setSellerAmount(sellerAmount);
        so.setCompletedAt(Instant.now());
        setStatus(so, "completed");

        if (!installmentService.isInstallmentOrder(so.getOrderId())) {
            walletService.releaseForOrder(so.getSellerProfileId(), sellerAmount, so.getId());
        }
        Long buyerId = orderRepository.findById(so.getOrderId()).map(Order::getUserId).orElse(null);
        if (buyerId != null) {
            affiliateService.recordForCompletedOrder(so, buyerId);
            xuService.earnForSellerOrder(so, buyerId);
        }
        syncParentOrderStatus(so);
        return so;
    }

    // ------------------------------------------------------------------ hoá đơn

    @Transactional(readOnly = true)
    public Invoice invoice(Store store, Long id) {
        SellerOrder so = find(store, id);
        Order order = orderRepository.findById(so.getOrderId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
        return invoiceService.buildForSellerOrder(orderViewService.build(order, true, true), so.getId());
    }

    public byte[] invoicePdf(Invoice invoice) {
        return invoiceService.renderPdf(invoice);
    }

    /** Gửi hoá đơn tới email chỉ định, mặc định là email của khách đặt đơn. */
    @Transactional(readOnly = true)
    public void emailInvoice(Store store, Long id, String email) {
        Invoice invoice = invoice(store, id);
        String to = email == null || email.isBlank() ? invoice.customer().email() : email.trim();
        if (to == null || !EMAIL.matcher(to).matches()) {
            throw ValidationException.of("email", "Email không hợp lệ");
        }
        invoiceService.email(invoice, to);
    }

    // ------------------------------------------------------------------ helpers

    /** Đang giao thì hoàn kho + bỏ tiền đã giữ; trước đó chưa trừ gì nên chỉ đổi trạng thái. */
    private void cancel(SellerOrder so) {
        if ("shipping".equals(so.getStatus())) {
            for (OrderItem item : orderItemRepository.findBySellerOrderIdOrderByIdAsc(so.getId())) {
                stockService.restore(item.getProductId(), item.getSku(), qty(item));
            }
            if (!installmentService.isInstallmentOrder(so.getOrderId())) {
                walletService.reverseOrderHold(so.getSellerProfileId(), amounts.sellerNet(so), so.getId());
            }
        }
        setStatus(so, "cancelled");
    }

    /** Mọi phần đơn hoàn tất → đơn gốc hoàn tất; mọi phần đơn huỷ → đơn gốc huỷ. */
    private void syncParentOrderStatus(SellerOrder so) {
        List<String> statuses = sellerOrderRepository.findByOrderId(so.getOrderId()).stream()
                .map(SellerOrder::getStatus).toList();
        String parentStatus = statuses.stream().allMatch("completed"::equals) ? "completed"
                : statuses.stream().allMatch("cancelled"::equals) ? "cancelled" : null;
        if (parentStatus != null) {
            orderRepository.findById(so.getOrderId()).ifPresent(order -> {
                order.setStatus(parentStatus);
                order.setUpdatedAt(Instant.now());
                orderRepository.save(order);
                if ("cancelled".equals(parentStatus)) {
                    releaseCancelledOrder(order);
                }
            });
        }
    }

    /** Toàn bộ đơn bị huỷ: hoàn xu đã dùng, đóng khoản trả góp và trả lại voucher thu cũ đã dùng. */
    private void releaseCancelledOrder(Order order) {
        xuService.refundOrder(order);
        installmentService.cancelForOrder(order.getId());
        tradeInService.releaseForOrder(order.getId(), order.getDiscountCode());
    }

    /**
     * COD: tiền shipper thu = hàng (sau voucher/xu/giảm của gian hàng) + phí ship (sau voucher miễn ship).
     * Voucher miễn ship của sàn chia theo tỉ lệ tạm tính; của gian hàng giảm đúng phí ship của gian hàng đó.
     */
    private Long codAmount(Order order, SellerOrder so) {
        if (order == null || !"cod".equals(order.getPaymentMethod())) {
            return 0L;
        }
        BigDecimal shippingDiscount = BigDecimal.ZERO;
        if (nz(order.getDiscountAmount()).signum() > 0 && order.getDiscountCode() != null) {
            Coupon coupon = couponRepository.findFirstByCodeIgnoreCase(order.getDiscountCode()).orElse(null);
            if (coupon != null && coupon.isFreeShip()) {
                BigDecimal productsTotal = sellerOrderRepository.findByOrderId(order.getId()).stream()
                        .map(p -> nz(p.getSubtotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
                if (productsTotal.signum() > 0) {
                    shippingDiscount = order.getDiscountAmount().multiply(nz(so.getSubtotal()))
                            .divide(productsTotal, 2, RoundingMode.HALF_UP);
                }
            }
        }
        shippingDiscount = shippingDiscount.max(nz(so.getStoreShippingSubsidy()));
        BigDecimal cod = nz(so.getSubtotal()).subtract(amounts.discountShare(so)).add(nz(so.getShippingFee()))
                .subtract(shippingDiscount);
        return Math.max(0, cod.setScale(0, RoundingMode.HALF_UP).longValue());
    }

    private static void assertTransition(String current, String next) {
        if (!TRANSITIONS.getOrDefault(current, Set.of()).contains(next)) {
            throw ApiException.unprocessable("Không thể chuyển trạng thái từ '" + current + "' sang '" + next + "'");
        }
    }

    private void setStatus(SellerOrder so, String status) {
        so.setStatus(status);
        so.setUpdatedAt(Instant.now());
        sellerOrderRepository.save(so);
    }

    private SellerOrderView view(SellerOrder so) {
        return SellerOrderView.of(so, orderItemRepository.findBySellerOrderIdOrderByIdAsc(so.getId()),
                orderRepository.findById(so.getOrderId()).orElse(null),
                shipmentRepository.findFirstBySellerOrderId(so.getId()).orElse(null));
    }

    private SellerOrder find(Store store, Long id) {
        return ensureInStore(store, sellerOrderRepository.findById(id));
    }

    private SellerOrder lock(Store store, Long id) {
        return ensureInStore(store, sellerOrderRepository.findByIdForUpdate(id));
    }

    private static SellerOrder ensureInStore(Store store, Optional<SellerOrder> found) {
        SellerOrder so = found.orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
        if (!Objects.equals(so.getStoreId(), store.getId())) {
            throw ApiException.notFound("Đơn không thuộc gian hàng này");
        }
        return so;
    }

    private static int qty(OrderItem item) {
        return item.getQuantity() == null ? 0 : item.getQuantity();
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
