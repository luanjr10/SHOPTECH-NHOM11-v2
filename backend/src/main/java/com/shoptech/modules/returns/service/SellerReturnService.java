package com.shoptech.modules.returns.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.mail.MailService;
import com.shoptech.modules.affiliate.service.AffiliateService;
import com.shoptech.modules.xu.service.XuService;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.order.dto.SellerOrderView;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.repository.OrderItemRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import com.shoptech.modules.order.service.SellerOrderService;
import com.shoptech.modules.returns.dto.RespondReturnRequest;
import com.shoptech.modules.returns.dto.ReturnRequestView;
import com.shoptech.modules.returns.entity.ReturnRequest;
import com.shoptech.modules.returns.repository.ReturnRequestRepository;
import com.shoptech.modules.store.entity.Store;
import com.shoptech.modules.user.dto.UserSummary;
import com.shoptech.modules.user.entity.User;
import com.shoptech.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Seller Center — xử lý yêu cầu hoàn trả / bảo hành của khách cho sản phẩm thuộc gian hàng. */
@Service
@RequiredArgsConstructor
public class SellerReturnService {

    private static final int PER_PAGE = 15;

    private final ReturnRequestRepository returnRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final SellerOrderService sellerOrderService;
    private final RequestValidator requestValidator;
    private final MailService mailService;
    private final AffiliateService affiliateService;
    private final XuService xuService;
    private final AppProperties props;

    @Transactional(readOnly = true)
    public PagedResult<ReturnRequestView> list(Store store, String status, Integer page, Integer perPage) {
        Page<ReturnRequest> result = returnRepository.searchByStore(store.getId(),
                status == null || status.isBlank() ? null : status,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending().and(Sort.by("id").descending())));
        List<ReturnRequest> rows = result.getContent();

        Map<Long, OrderItem> items = orderItemRepository.findAllById(rows.stream().map(ReturnRequest::getOrderItemId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(OrderItem::getId, Function.identity()));
        Map<Long, User> users = userRepository.findAllById(rows.stream().map(ReturnRequest::getUserId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));

        List<ReturnRequestView> content = rows.stream().map(r -> ReturnRequestView.of(r,
                itemRef(items.get(r.getOrderItemId())), UserSummary.of(users.get(r.getUserId()), props), null)).toList();
        return PagedResult.of(new PageImpl<>(content, result.getPageable(), result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ReturnRequestView detail(Store store, Long id) {
        ReturnRequest r = ensureInStore(store, returnRepository.findById(id));
        return view(r, sellerOrderService.detail(store, r.getSellerOrderId()));
    }

    /** Duyệt / từ chối (chỉ khi còn chờ xử lý) và email kết quả cho khách sau khi lưu thành công. */
    @Transactional
    public ReturnRequestView respond(Store store, Long id, RespondReturnRequest request) {
        ReturnRequest r = ensureInStore(store, returnRepository.findByIdForUpdate(id));
        if (!ReturnRequest.PENDING.equals(r.getStatus())) {
            throw ApiException.unprocessable("Yêu cầu này đã được xử lý rồi");
        }
        requestValidator.validate(request).throwIfFailed();

        Instant now = Instant.now();
        r.setStatus(request.status());
        r.setSellerResponse(request.sellerResponse().trim());
        r.setRespondedAt(now);
        r.setUpdatedAt(now);
        returnRepository.save(r);

        if ("approved".equals(request.status())) {
            affiliateService.cancelForSellerOrder(r.getSellerOrderId());
            xuService.reverseEarnForSellerOrder(r.getSellerOrderId());
        }

        ReturnRequestView result = view(r, null);
        afterCommit(() -> notifyCustomer(result));
        return result;
    }

    private void notifyCustomer(ReturnRequestView r) {
        if (r.user() == null || r.user().email() == null) {
            return;
        }
        boolean approved = "approved".equals(r.status());
        String typeLabel = "warranty".equals(r.type()) ? "bảo hành" : "hoàn trả";
        mailService.sendQuietly(r.user().email(),
                (approved ? "Đã duyệt" : "Đã từ chối") + " yêu cầu " + typeLabel + " — ShopTech",
                "return-responded",
                Map.of("name", r.user().name() == null ? "" : r.user().name(),
                        "typeLabel", typeLabel,
                        "productName", r.orderItem() == null ? "sản phẩm" : r.orderItem().productName(),
                        "approved", approved,
                        "sellerResponse", r.sellerResponse() == null ? "" : r.sellerResponse()));
    }

    private ReturnRequestView view(ReturnRequest r, SellerOrderView sellerOrder) {
        OrderItem item = r.getOrderItemId() == null ? null : orderItemRepository.findById(r.getOrderItemId()).orElse(null);
        User user = r.getUserId() == null ? null : userRepository.findById(r.getUserId()).orElse(null);
        return ReturnRequestView.of(r, itemRef(item), UserSummary.of(user, props), sellerOrder);
    }

    /** Yêu cầu phải thuộc một phần đơn của gian hàng; không thì coi như không tồn tại. */
    private ReturnRequest ensureInStore(Store store, Optional<ReturnRequest> found) {
        ReturnRequest r = found.orElseThrow(() -> ApiException.notFound("Không tìm thấy yêu cầu"));
        SellerOrder so = r.getSellerOrderId() == null ? null : sellerOrderRepository.findById(r.getSellerOrderId()).orElse(null);
        if (so == null || !Objects.equals(so.getStoreId(), store.getId())) {
            throw ApiException.notFound("Không tìm thấy yêu cầu");
        }
        return r;
    }

    private static ReturnRequestView.ItemRef itemRef(OrderItem i) {
        return i == null ? null
                : new ReturnRequestView.ItemRef(i.getId(), i.getProductId(), i.getProductName(), i.getSku(), i.getQuantity());
    }

    private static void afterCommit(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }
}
