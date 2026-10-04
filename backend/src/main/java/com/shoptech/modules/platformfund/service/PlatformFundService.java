package com.shoptech.modules.platformfund.service;

import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.entity.Shipment;
import com.shoptech.modules.order.repository.OrderItemRepository;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import com.shoptech.modules.order.repository.ShipmentRepository;
import com.shoptech.modules.platformfund.dto.PlatformFundOrder;
import com.shoptech.modules.seller.entity.SellerProfile;
import com.shoptech.modules.seller.repository.SellerProfileRepository;
import com.shoptech.modules.seller.repository.SellerWalletRepository;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.store.repository.StoreRepository;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import com.shoptech.modules.withdrawal.repository.WithdrawalRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Quỹ sàn: tiền khách đã trả nhưng sàn đang giữ (đơn đang giao / đã giao, chưa hoàn tất)
 * và tiền đã quyết toán cho người bán khi đơn hoàn tất.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlatformFundService {

    private static final int PER_PAGE = 15;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final SellerWalletRepository walletRepository;
    private final WithdrawalRequestRepository withdrawalRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShipmentRepository shipmentRepository;
    private final StoreRepository storeRepository;
    private final SellerProfileRepository profileRepository;
    private final UserRepository userRepository;

    public record Summary(BigDecimal totalHeld, BigDecimal totalWithdrawable, BigDecimal totalPaidOut) {
    }

    public Summary summary() {
        return new Summary(walletRepository.sumPending(), walletRepository.sumWithdrawable(), withdrawalRepository.sumApproved());
    }

    /** Tiền đang giữ = tạm tính − hoa hồng sàn, cho các đơn đang giao / đã giao. */
    public PagedResult<PlatformFundOrder> held(Integer page, Integer perPage) {
        Page<SellerOrder> result = sellerOrderRepository.findByStatusIn(List.of("shipping", "delivered"),
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()));
        return build(result, true);
    }

    public PagedResult<PlatformFundOrder> settlements(Integer page, Integer perPage) {
        Page<SellerOrder> result = sellerOrderRepository.findByStatusIn(List.of("completed"),
                Pagination.of(page, perPage, PER_PAGE, Sort.by("completedAt").descending()));
        return build(result, false);
    }

    private PagedResult<PlatformFundOrder> build(Page<SellerOrder> page, boolean held) {
        List<SellerOrder> list = page.getContent();
        List<Long> ids = list.stream().map(SellerOrder::getId).toList();

        Map<Long, List<OrderItem>> items = ids.isEmpty() ? Map.of()
                : orderItemRepository.findBySellerOrderIdInOrderByIdAsc(ids).stream()
                .collect(Collectors.groupingBy(OrderItem::getSellerOrderId));
        Map<Long, Shipment> shipments = !held || ids.isEmpty() ? Map.of()
                : shipmentRepository.findBySellerOrderIdIn(ids).stream()
                .collect(Collectors.toMap(Shipment::getSellerOrderId, s -> s, (a, b) -> a));
        Map<Long, Store> stores = storeRepository.findByIdIn(list.stream().map(SellerOrder::getStoreId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Store::getId, s -> s));
        Map<Long, Order> orders = orderRepository.findAllById(list.stream().map(SellerOrder::getOrderId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Order::getId, o -> o));
        Map<Long, SellerProfile> profiles = profileRepository.findAllById(list.stream().map(SellerOrder::getSellerProfileId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(SellerProfile::getId, p -> p));
        Map<Long, User> users = userRepository.findAllById(profiles.values().stream().map(SellerProfile::getUserId)
                        .collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, u -> u));

        List<PlatformFundOrder> content = list.stream().map(so -> {
            BigDecimal rate = so.getCommissionRate() == null ? BigDecimal.ZERO : so.getCommissionRate();
            BigDecimal subtotal = so.getSubtotal() == null ? BigDecimal.ZERO : so.getSubtotal();
            BigDecimal heldAmount = held
                    ? subtotal.multiply(BigDecimal.ONE.subtract(rate.divide(HUNDRED, 6, RoundingMode.HALF_UP)))
                    .setScale(2, RoundingMode.HALF_UP)
                    : null;
            Store store = stores.get(so.getStoreId());
            Order order = orders.get(so.getOrderId());
            SellerProfile profile = profiles.get(so.getSellerProfileId());
            User owner = profile == null ? null : users.get(profile.getUserId());
            Shipment shipment = shipments.get(so.getId());

            return new PlatformFundOrder(
                    so,
                    heldAmount,
                    held ? null : so.getSellerAmount(),
                    !held || "delivered".equals(so.getStatus()),
                    store == null ? null : new PlatformFundOrder.StoreRef(store.getId(), store.getName()),
                    profile == null ? null : new PlatformFundOrder.Seller(profile.getId(), profile.getDisplayName(),
                            owner == null ? null : new PlatformFundOrder.UserRef(owner.getId(), owner.getName(), owner.getUsername())),
                    items.getOrDefault(so.getId(), List.of()),
                    order == null ? null : new PlatformFundOrder.OrderRef(order.getId(), order.getReceiverName(),
                            order.getReceiverPhone(), order.getShippingAddress(), order.getPaymentMethod()),
                    shipment == null ? null : new PlatformFundOrder.ShipmentRef(shipment.getStatus(),
                            shipment.getExpectedDeliveryTime(), shipment.getShippedAt()));
        }).toList();
        return PagedResult.of(new PageImpl<>(content, page.getPageable(), page.getTotalElements()));
    }
}
