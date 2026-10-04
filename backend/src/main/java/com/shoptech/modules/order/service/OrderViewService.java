package com.shoptech.modules.order.service;

import com.shoptech.config.AppProperties;
import com.shoptech.modules.order.dto.OrderResponse;
import com.shoptech.modules.order.dto.OrderResponse.SellerOrderResponse;
import com.shoptech.modules.order.dto.OrderResponse.StoreRef;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.repository.OrderItemRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import com.shoptech.modules.store.repository.StoreRepository;
import com.shoptech.modules.user.dto.UserSummary;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Dựng dữ liệu hiển thị cho danh sách đơn hàng: nạp theo lô người mua, phần đơn theo gian hàng,
 * tên gian hàng và (tuỳ chọn) sản phẩm trong đơn — tránh truy vấn lặp cho từng dòng.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderViewService {

    private final SellerOrderRepository sellerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final AppProperties props;

    public List<OrderResponse> build(List<Order> orders, boolean withUser, boolean withItems) {
        if (orders.isEmpty()) {
            return List.of();
        }
        List<Long> orderIds = orders.stream().map(Order::getId).toList();
        List<SellerOrder> sellerOrders = sellerOrderRepository.findByOrderIdInOrderByIdAsc(orderIds);

        Map<Long, StoreRef> stores = storeRepository.findByIdIn(sellerOrders.stream()
                        .map(SellerOrder::getStoreId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(s -> s.getId(), s -> new StoreRef(s.getId(), s.getName())));

        Map<Long, List<OrderItem>> itemsBySellerOrder = !withItems ? Map.of()
                : orderItemRepository.findBySellerOrderIdInOrderByIdAsc(sellerOrders.stream().map(SellerOrder::getId).toList())
                .stream().collect(Collectors.groupingBy(OrderItem::getSellerOrderId));

        Map<Long, List<SellerOrderResponse>> sellerOrdersByOrder = sellerOrders.stream()
                .map(so -> SellerOrderResponse.of(so, stores.get(so.getStoreId()),
                        withItems ? itemsBySellerOrder.getOrDefault(so.getId(), List.of()) : null))
                .collect(Collectors.groupingBy(SellerOrderResponse::orderId));

        Map<Long, UserSummary> users = !withUser ? Map.of()
                : userRepository.findAllById(orders.stream().map(Order::getUserId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(u -> u.getId(), u -> UserSummary.of(u, props)));

        return orders.stream().map(o -> OrderResponse.of(o, users.get(o.getUserId()),
                sellerOrdersByOrder.getOrDefault(o.getId(), List.of()))).toList();
    }

    public OrderResponse build(Order order, boolean withUser, boolean withItems) {
        return build(List.of(order), withUser, withItems).get(0);
    }
}
