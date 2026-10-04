package com.shoptech.modules.order.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.modules.order.dto.CustomerOrderView;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.entity.Shipment;
import com.shoptech.modules.order.repository.OrderItemRepository;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import com.shoptech.modules.order.repository.ShipmentRepository;
import com.shoptech.modules.returns.entity.ReturnRequest;
import com.shoptech.modules.returns.repository.ReturnRequestRepository;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Đơn hàng phía khách: xem danh sách / chi tiết, huỷ khi mọi phần đơn còn chờ xác nhận,
 * xác nhận đã nhận hàng cho từng gian hàng (mở quyền gửi yêu cầu hoàn trả / bảo hành).
 */
@Service
@RequiredArgsConstructor
public class CustomerOrderService {

    private static final int PER_PAGE = 15;
    public static final int WARRANTY_MONTHS = 12;

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShipmentRepository shipmentRepository;
    private final StoreRepository storeRepository;
    private final ReturnRequestRepository returnRepository;
    private final SellerOrderService sellerOrderService;

    @Transactional(readOnly = true)
    public PagedResult<CustomerOrderView> mine(Long userId, Integer page, Integer perPage) {
        Page<Order> orders = orderRepository.findByUserId(userId,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending().and(Sort.by("id").descending())));
        List<CustomerOrderView> content = views(orders.getContent(), false);
        return PagedResult.of(new PageImpl<>(content, orders.getPageable(), orders.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public CustomerOrderView detail(Long userId, Long orderId) {
        return views(List.of(owned(userId, orderId)), true).get(0);
    }

    /** Chỉ huỷ được khi mọi phần đơn còn "pending" (chưa trừ kho / giữ tiền nên không cần hoàn gì). */
    @Transactional
    public CustomerOrderView cancel(Long userId, Long orderId) {
        Order order = owned(userId, orderId);
        List<SellerOrder> parts = sellerOrderRepository.findByOrderId(order.getId()).stream()
                .map(so -> sellerOrderRepository.findByIdForUpdate(so.getId()).orElse(so)).toList();
        if (parts.isEmpty() || parts.stream().anyMatch(so -> !"pending".equals(so.getStatus()))) {
            throw ApiException.unprocessable("Đơn hàng đã được xác nhận hoặc đang giao, không thể hủy.");
        }
        Instant now = Instant.now();
        parts.forEach(so -> {
            so.setStatus("cancelled");
            so.setUpdatedAt(now);
            sellerOrderRepository.save(so);
        });
        order.setStatus("cancelled");
        order.setUpdatedAt(now);
        orderRepository.save(order);
        return views(List.of(order), false).get(0);
    }

    @Transactional
    public SellerOrder completeSellerOrder(Long userId, Long orderId, Long sellerOrderId) {
        Order order = owned(userId, orderId);
        SellerOrder so = sellerOrderRepository.findById(sellerOrderId)
                .filter(s -> Objects.equals(s.getOrderId(), order.getId()))
                .orElseThrow(() -> ApiException.notFound("Đơn không thuộc order này"));
        return sellerOrderService.completeByCustomer(so.getId());
    }

    /** Bảo hành 12 tháng tính từ lúc thanh toán (hoặc lúc đặt với COD), chỉ áp dụng khi phần đơn đã hoàn tất. */
    public static CustomerOrderView.Warranty warranty(SellerOrder so, Order order) {
        if (!"completed".equals(so.getStatus()) || order == null) {
            return new CustomerOrderView.Warranty(false, "chua_ap_dung", "Chưa áp dụng (đơn chưa hoàn tất)", null, null);
        }
        Instant purchasedAt = order.getPaidAt() != null ? order.getPaidAt() : order.getCreatedAt();
        Instant expiresAt = purchasedAt == null ? null
                : purchasedAt.atOffset(ZoneOffset.UTC).plusMonths(WARRANTY_MONTHS).toInstant();
        boolean covered = expiresAt != null && expiresAt.isAfter(Instant.now());
        return new CustomerOrderView.Warranty(true, covered ? "con_han" : "het_han",
                covered ? "Còn hạn bảo hành" : "Hết hạn bảo hành", expiresAt, purchasedAt);
    }

    // ------------------------------------------------------------------ helpers

    private List<CustomerOrderView> views(List<Order> orders, boolean withWarrantyAndReturns) {
        if (orders.isEmpty()) {
            return List.of();
        }
        List<SellerOrder> parts = sellerOrderRepository.findByOrderIdInOrderByIdAsc(orders.stream().map(Order::getId).toList());
        List<Long> partIds = parts.stream().map(SellerOrder::getId).toList();

        Map<Long, List<OrderItem>> items = partIds.isEmpty() ? Map.of()
                : orderItemRepository.findBySellerOrderIdInOrderByIdAsc(partIds).stream()
                .collect(Collectors.groupingBy(OrderItem::getSellerOrderId));
        Map<Long, Shipment> shipments = partIds.isEmpty() ? Map.of()
                : shipmentRepository.findBySellerOrderIdIn(partIds).stream()
                .collect(Collectors.toMap(Shipment::getSellerOrderId, Function.identity(), (a, b) -> a));
        Map<Long, Store> stores = storeRepository.findByIdIn(parts.stream().map(SellerOrder::getStoreId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Store::getId, Function.identity()));

        // Yêu cầu hoàn trả mới nhất của từng sản phẩm trong đơn
        Map<Long, ReturnRequest> latestReturns = !withWarrantyAndReturns ? Map.of()
                : returnRepository.findByOrderItemIdIn(items.values().stream().flatMap(List::stream)
                        .map(OrderItem::getId).toList()).stream()
                .collect(Collectors.toMap(ReturnRequest::getOrderItemId, Function.identity(),
                        (a, b) -> a.getId() >= b.getId() ? a : b));

        Map<Long, Order> orderById = orders.stream().collect(Collectors.toMap(Order::getId, Function.identity()));
        Map<Long, List<CustomerOrderView.SellerOrderPart>> partsByOrder = parts.stream().map(so -> {
            Store s = stores.get(so.getStoreId());
            List<CustomerOrderView.Item> lines = items.getOrDefault(so.getId(), List.of()).stream()
                    .map(i -> new CustomerOrderView.Item(i, latestReturns.get(i.getId()))).toList();
            return new CustomerOrderView.SellerOrderPart(so.getId(), so.getOrderId(), so.getStoreId(), so.getStatus(),
                    so.getSubtotal(), so.getShippingFee(), so.getCompletedAt(), so.getCreatedAt(),
                    s == null ? null : new CustomerOrderView.StoreRef(s.getId(), s.getName(), s.getSlug()),
                    lines, shipments.get(so.getId()),
                    withWarrantyAndReturns ? warranty(so, orderById.get(so.getOrderId())) : null,
                    withWarrantyAndReturns ? "completed".equals(so.getStatus()) : null);
        }).collect(Collectors.groupingBy(CustomerOrderView.SellerOrderPart::orderId));

        return orders.stream().map(o -> new CustomerOrderView(o.getId(), o.getStatus(), o.getTotalAmount(),
                o.getShippingFee(), o.getExpectedDeliveryTime(), o.getPaymentMethod(), o.getDiscountCode(),
                o.getDiscountAmount(), o.getPaidAt(), o.getReceiverName(), o.getReceiverPhone(), o.getShippingAddress(),
                o.getCreatedAt(), o.getUpdatedAt(), partsByOrder.getOrDefault(o.getId(), List.of()))).toList();
    }

    private Order owned(Long userId, Long orderId) {
        return orderRepository.findById(orderId)
                .filter(o -> Objects.equals(o.getUserId(), userId))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
    }
}
