package com.shoptech.modules.returns.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.entity.OrderItem;
import com.shoptech.modules.order.entity.SellerOrder;
import com.shoptech.modules.order.repository.OrderItemRepository;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import com.shoptech.modules.returns.dto.CustomerReturnView;
import com.shoptech.modules.returns.entity.ReturnRequest;
import com.shoptech.modules.returns.repository.ReturnRequestRepository;
import com.shoptech.modules.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** Khách gửi / xem yêu cầu hoàn trả hoặc bảo hành cho sản phẩm trong đơn đã hoàn tất. */
@Service
@RequiredArgsConstructor
public class CustomerReturnService {

    private static final int PER_PAGE = 15;
    private static final int MAX_IMAGES = 5;
    private static final String IMAGE_FOLDER = "returns-shoptech";
    private static final Set<String> TYPES = Set.of("return", "warranty");

    private final ReturnRequestRepository returnRepository;
    private final OrderItemRepository orderItemRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderRepository orderRepository;
    private final StoreRepository storeRepository;
    private final CloudinaryService cloudinaryService;

    @Transactional(readOnly = true)
    public PagedResult<CustomerReturnView> mine(Long userId, Integer page, Integer perPage) {
        Page<ReturnRequest> result = returnRepository.findByUserId(userId,
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending().and(Sort.by("id").descending())));
        List<CustomerReturnView> content = result.getContent().stream().map(this::view).toList();
        return PagedResult.of(new PageImpl<>(content, result.getPageable(), result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public CustomerReturnView detail(Long userId, Long id) {
        ReturnRequest r = returnRepository.findById(id)
                .filter(x -> Objects.equals(x.getUserId(), userId))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy yêu cầu"));
        return view(r);
    }

    @Transactional
    public ReturnRequest submit(Long userId, Long orderItemId, String type, String reason, List<MultipartFile> rawImages) {
        OrderItem item = orderItemRepository.findById(orderItemId).orElse(null);
        SellerOrder so = item == null ? null : sellerOrderRepository.findById(item.getSellerOrderId()).orElse(null);
        Order order = so == null ? null : orderRepository.findById(so.getOrderId()).orElse(null);
        if (order == null || !Objects.equals(order.getUserId(), userId)) {
            throw ApiException.notFound("Không tìm thấy sản phẩm trong đơn hàng của bạn");
        }
        if (!"completed".equals(so.getStatus())) {
            throw ApiException.unprocessable(
                    "Chỉ có thể gửi yêu cầu hoàn trả/bảo hành sau khi đơn đã hoàn tất (đã nhận hàng).");
        }
        if (returnRepository.existsByOrderItemIdAndStatus(orderItemId, ReturnRequest.PENDING)) {
            throw ApiException.unprocessable("Sản phẩm này đang có 1 yêu cầu chờ xử lý — vui lòng đợi seller phản hồi.");
        }

        List<MultipartFile> images = ImageRules.nonEmpty(rawImages);
        Validator v = new Validator();
        v.check(type != null && TYPES.contains(type), "type", "Vui lòng chọn hoàn trả hoặc bảo hành");
        v.check(reason != null && !reason.isBlank(), "reason", "Vui lòng nhập lý do");
        v.check(reason == null || reason.length() <= 1000, "reason", "Lý do không được vượt quá 1000 ký tự");
        v.check(!images.isEmpty(), "images", "Vui lòng đính kèm ít nhất một ảnh minh chứng");
        v.check(images.size() <= MAX_IMAGES, "images", "Chỉ được đính kèm tối đa " + MAX_IMAGES + " ảnh");
        ImageRules.check(v, images, "images", true, ImageRules.DEFAULT_EXT,
                "File tải lên phải là hình ảnh",
                "Ảnh phải có định dạng jpg, jpeg, png hoặc webp",
                "Dung lượng mỗi ảnh không được vượt quá 5MB");
        v.throwIfFailed();

        List<String> urls = new ArrayList<>();
        for (MultipartFile f : images) {
            urls.add(cloudinaryService.uploadImage(f, IMAGE_FOLDER));
        }

        ReturnRequest r = new ReturnRequest();
        r.setOrderItemId(item.getId());
        r.setSellerOrderId(so.getId());
        r.setUserId(userId);
        r.setType(type);
        r.setReason(reason.trim());
        r.setImages(urls);
        r.setStatus(ReturnRequest.PENDING);
        r.setCreatedAt(Instant.now());
        r.setUpdatedAt(r.getCreatedAt());
        return returnRepository.save(r);
    }

    private CustomerReturnView view(ReturnRequest r) {
        OrderItem item = r.getOrderItemId() == null ? null : orderItemRepository.findById(r.getOrderItemId()).orElse(null);
        SellerOrder so = r.getSellerOrderId() == null ? null : sellerOrderRepository.findById(r.getSellerOrderId()).orElse(null);
        CustomerReturnView.StoreRef store = so == null || so.getStoreId() == null ? null
                : storeRepository.findById(so.getStoreId())
                .map(s -> new CustomerReturnView.StoreRef(s.getId(), s.getName(), s.getSlug())).orElse(null);
        return new CustomerReturnView(r, item,
                so == null ? null : new CustomerReturnView.SellerOrderRef(so.getId(), so.getStatus(), store));
    }
}
