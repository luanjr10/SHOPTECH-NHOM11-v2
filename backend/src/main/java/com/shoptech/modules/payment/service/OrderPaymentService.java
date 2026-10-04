package com.shoptech.modules.payment.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import com.shoptech.modules.order.service.CustomerOrderService;
import com.shoptech.modules.payment.gateway.MomoGateway;
import com.shoptech.modules.payment.gateway.PaymentGatewayException;
import com.shoptech.modules.payment.gateway.VnpayGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;

/**
 * Thanh toán đơn hàng qua MoMo / VNPay (sandbox). Tạo link thanh toán cho đơn "pending" của chính khách;
 * cổng trả kết quả (trang return / IPN) → đơn "paid", thất bại → tự huỷ đơn chưa thanh toán.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderPaymentService {

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final CustomerOrderService customerOrderService;
    private final MomoGateway momoGateway;
    private final VnpayGateway vnpayGateway;
    private final AppProperties props;

    @Transactional
    public String createMomoUrl(Long userId, Long orderId) {
        Order order = payableOrder(userId, orderId, "momo");
        String ref = momoGateway.partnerCode() + "-" + order.getId() + "-" + Instant.now().getEpochSecond();
        try {
            String url = momoGateway.createPaymentUrl(ref, amount(order), "Thanh toan don hang ShopTech #" + order.getId(),
                    props.backendUrl("/api/payments/momo/return"), props.backendUrl("/api/payments/momo/notify"));
            saveRef(order, ref);
            return url;
        } catch (PaymentGatewayException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
    }

    @Transactional
    public String createVnpayUrl(Long userId, Long orderId, String clientIp) {
        Order order = payableOrder(userId, orderId, "vnpay");
        String ref = "ORDER" + order.getId() + "-" + Instant.now().getEpochSecond();
        String url = vnpayGateway.createPaymentUrl(ref, amount(order), "Thanh toan don hang ShopTech #" + order.getId(),
                props.backendUrl("/api/payments/vnpay/return"), clientIp);
        saveRef(order, ref);
        return url;
    }

    /** Kết quả MoMo (trang return hoặc IPN). @return id đơn nếu tìm thấy, kèm trạng thái thành công. */
    @Transactional
    public Outcome handleMomo(Map<String, String> params) {
        return finish(params.get("orderId"), momoGateway.verifyReturn(params), momoGateway.isSuccess(params), "MoMo", params);
    }

    @Transactional
    public Outcome handleVnpay(Map<String, String> params) {
        return finish(params.get("vnp_TxnRef"), vnpayGateway.verifyReturn(params), vnpayGateway.isSuccess(params),
                "VNPay", params);
    }

    public record Outcome(Long orderId, boolean success) {
    }

    /** Trang kết quả thanh toán của client. */
    public String frontendResultUrl(Outcome outcome) {
        String url = props.frontendUrl().replaceAll("/+$", "") + "/thanh-toan/ket-qua?status="
                + (outcome.success() ? "success" : "failed");
        return outcome.orderId() == null ? url : url + "&order_id=" + outcome.orderId();
    }

    // ------------------------------------------------------------------ helpers

    /**
     * Chỉ đổi trạng thái đơn khi chữ ký hợp lệ: thành công → "paid", thất bại → huỷ đơn chưa thanh toán.
     * Chữ ký sai (request giả mạo) thì giữ nguyên đơn, chỉ báo thất bại cho người dùng.
     */
    private Outcome finish(String ref, boolean validSignature, boolean success, String gateway, Map<String, String> params) {
        Order order = ref == null ? null : orderRepository.findFirstByPaymentRef(ref).orElse(null);
        if (order != null && validSignature && success) {
            markPaid(order);
            return new Outcome(order.getId(), true);
        }
        if (order != null && validSignature) {
            cancelUnpaid(order);
        }
        log.warn("{} trả kết quả {}: {}", gateway, validSignature ? "thanh toán thất bại" : "sai chữ ký", params);
        return new Outcome(order == null ? null : order.getId(), false);
    }

    /** Chỉ chuyển "pending" → "paid" một lần (return và IPN có thể cùng tới). */
    private void markPaid(Order order) {
        if (order.getPaidAt() != null || !"pending".equals(order.getStatus())) {
            return;
        }
        order.setStatus("paid");
        order.setPaidAt(Instant.now());
        order.setUpdatedAt(order.getPaidAt());
        orderRepository.save(order);
    }

    private void cancelUnpaid(Order order) {
        if (!"pending".equals(order.getStatus()) || order.getPaidAt() != null) {
            return;
        }
        // Kiểm tra trước: nếu gọi cancel() rồi để nó ném lỗi thì transaction chung bị đánh dấu rollback.
        boolean allPending = sellerOrderRepository.findByOrderId(order.getId()).stream()
                .allMatch(so -> "pending".equals(so.getStatus()));
        if (!allPending) {
            log.error("Không tự hủy được đơn #{} thanh toán thất bại: người bán đã xử lý đơn", order.getId());
            return;
        }
        customerOrderService.cancel(order.getUserId(), order.getId());
    }

    private Order payableOrder(Long userId, Long orderId, String method) {
        if (orderId == null) {
            throw ApiException.unprocessable("Thiếu mã đơn hàng");
        }
        Order order = orderRepository.findById(orderId)
                .filter(o -> Objects.equals(o.getUserId(), userId))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
        if (!method.equals(order.getPaymentMethod())) {
            throw ApiException.unprocessable("Đơn hàng không dùng phương thức thanh toán này");
        }
        if (!"pending".equals(order.getStatus()) || order.getPaidAt() != null) {
            throw ApiException.unprocessable("Đơn hàng không ở trạng thái chờ thanh toán");
        }
        return order;
    }

    private void saveRef(Order order, String ref) {
        order.setPaymentRef(ref);
        order.setUpdatedAt(Instant.now());
        orderRepository.save(order);
    }

    private static long amount(Order order) {
        BigDecimal total = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        return total.setScale(0, RoundingMode.HALF_UP).longValue();
    }
}
