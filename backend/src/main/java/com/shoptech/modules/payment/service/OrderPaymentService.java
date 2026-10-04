package com.shoptech.modules.payment.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.repository.OrderRepository;
import com.shoptech.modules.order.repository.SellerOrderRepository;
import com.shoptech.modules.order.service.CustomerOrderService;
import com.shoptech.modules.payment.gateway.MomoGateway;
import com.shoptech.modules.payment.gateway.OnePayGateway;
import com.shoptech.modules.payment.gateway.PaymentGatewayException;
import com.shoptech.modules.payment.gateway.SePayGateway;
import com.shoptech.modules.payment.gateway.VnpayGateway;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;

/**
 * Thanh toán đơn hàng qua MoMo / VNPay / OnePay / SePay (sandbox). Tạo link thanh toán cho đơn "pending" của chính khách;
 * cổng trả kết quả (trang return / IPN) → đơn "paid", thất bại → tự huỷ đơn chưa thanh toán.
 */
@Slf4j
@Service
public class OrderPaymentService {

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final CustomerOrderService customerOrderService;
    private final MomoGateway momoGateway;
    private final VnpayGateway vnpayGateway;
    private final OnePayGateway onePayGateway;
    private final SePayGateway sePayGateway;
    private final AppProperties props;
    /** Khoá SePay gửi kèm IPN (header X-Secret-Key). */
    private final String sepayIpnSecret;

    public OrderPaymentService(OrderRepository orderRepository, SellerOrderRepository sellerOrderRepository,
                               CustomerOrderService customerOrderService, MomoGateway momoGateway,
                               VnpayGateway vnpayGateway, OnePayGateway onePayGateway, SePayGateway sePayGateway,
                               AppProperties props, @Value("${app.payment.sepay-ipn-secret:}") String sepayIpnSecret) {
        this.orderRepository = orderRepository;
        this.sellerOrderRepository = sellerOrderRepository;
        this.customerOrderService = customerOrderService;
        this.momoGateway = momoGateway;
        this.vnpayGateway = vnpayGateway;
        this.onePayGateway = onePayGateway;
        this.sePayGateway = sePayGateway;
        this.props = props;
        this.sepayIpnSecret = sepayIpnSecret;
    }

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

    @Transactional
    public Outcome handleOnepay(Map<String, String> params) {
        return finish(params.get("vpc_MerchTxnRef"), onePayGateway.verifyReturn(params), onePayGateway.isSuccess(params),
                "OnePay", params);
    }

    // ------------------------------------------------------------------ OnePay / SePay

    @Transactional
    public String createOnepayUrl(Long userId, Long orderId, String clientIp) {
        Order order = payableOrder(userId, orderId, "onepay");
        String ref = "OP" + order.getId() + "-" + Instant.now().getEpochSecond();
        String url = onePayGateway.createPaymentUrl(ref, amount(order), "Thanh toan don hang ShopTech #" + order.getId(),
                props.backendUrl("/api/payments/onepay/return"), clientIp);
        saveRef(order, ref);
        return url;
    }

    /**
     * SePay nhận form POST có chữ ký chứ không phải link GET — trả về link trang trung gian của backend
     * ({@link #sepayCheckoutForm}) để trình duyệt mở rồi tự gửi form sang SePay.
     */
    @Transactional
    public String createSepayUrl(Long userId, Long orderId) {
        Order order = payableOrder(userId, orderId, "sepay");
        if (order.getPaymentRef() == null) {
            saveRef(order, "SEPAY_ORDER" + order.getId() + "_" + Instant.now().getEpochSecond());
        }
        return props.backendUrl("/api/payments/sepay/redirect/" + order.getId());
    }

    @Transactional(readOnly = true)
    public SePayGateway.CheckoutForm sepayCheckoutForm(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .filter(o -> "sepay".equals(o.getPaymentMethod()) && "pending".equals(o.getStatus())
                        && o.getPaidAt() == null && o.getPaymentRef() != null)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng chờ thanh toán"));
        String back = props.backendUrl("/api/payments/sepay/return?order=" + order.getId() + "&status=");
        return sePayGateway.checkoutForm(order.getPaymentRef(), amount(order),
                "Thanh toan don hang ShopTech #" + order.getId(), back + "success", back + "error", back + "cancel");
    }

    /**
     * SePay trả về trình duyệt KHÔNG kèm chữ ký nên không dùng để xác nhận tiền — đơn chỉ chuyển "paid"
     * khi nhận IPN (webhook) có khoá bí mật. Ở đây chỉ báo "đang xử lý" hoặc thất bại cho người dùng.
     */
    public Outcome sepayReturn(Long orderId, String status) {
        Order order = orderId == null ? null : orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return new Outcome(null, "failed");
        }
        if (order.getPaidAt() != null) {
            return new Outcome(order.getId(), "success");
        }
        return new Outcome(order.getId(), "success".equals(status) ? "pending" : "failed");
    }

    /** IPN của SePay: header X-Secret-Key phải khớp SEPAY_IPN_SECRET; ORDER_PAID + đủ tiền → "paid". */
    @Transactional
    public String handleSepayWebhook(String secretHeader, Map<String, Object> payload) {
        if (sepayIpnSecret == null || sepayIpnSecret.isBlank() || secretHeader == null
                || !MessageDigest.isEqual(sepayIpnSecret.getBytes(StandardCharsets.UTF_8),
                secretHeader.getBytes(StandardCharsets.UTF_8))) {
            throw ApiException.unauthorized("Unauthorized");
        }
        Map<?, ?> orderData = payload.get("order") instanceof Map<?, ?> m ? m : Map.of();
        Object invoice = orderData.get("order_invoice_number");
        Order order = invoice == null ? null : orderRepository.findFirstByPaymentRef(invoice.toString()).orElse(null);
        if (order == null) {
            log.warn("SePay IPN không khớp đơn nào: {}", payload);
            return "ignored";
        }
        if ("ORDER_PAID".equals(payload.get("notification_type")) && "pending".equals(order.getStatus())
                && order.getPaidAt() == null) {
            BigDecimal received = decimal(orderData.get("order_amount"));
            if (received.compareTo(order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount()) < 0) {
                log.warn("SePay IPN số tiền không khớp đơn #{}: nhận {}", order.getId(), received);
                return "amount mismatch";
            }
            Map<?, ?> tx = payload.get("transaction") instanceof Map<?, ?> t ? t : Map.of();
            if (tx.get("transaction_id") != null) {
                order.setSepayTransactionId(tx.get("transaction_id").toString());
            }
            markPaid(order);
        }
        return "ok";
    }

    public record Outcome(Long orderId, String status) {
    }

    /** Trang kết quả thanh toán của client (status: success | pending | failed). */
    public String frontendResultUrl(Outcome outcome) {
        String url = props.frontendUrl().replaceAll("/+$", "") + "/thanh-toan/ket-qua?status=" + outcome.status();
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
            return new Outcome(order.getId(), "success");
        }
        if (order != null && validSignature) {
            cancelUnpaid(order);
        }
        log.warn("{} trả kết quả {}: {}", gateway, validSignature ? "thanh toán thất bại" : "sai chữ ký", params);
        return new Outcome(order == null ? null : order.getId(), "failed");
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

    private static BigDecimal decimal(Object value) {
        try {
            return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString().trim());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private static long amount(Order order) {
        BigDecimal total = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        return total.setScale(0, RoundingMode.HALF_UP).longValue();
    }
}
