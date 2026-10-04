package com.shoptech.modules.order.service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.order.dto.Invoice;
import com.shoptech.modules.order.dto.OrderResponse;
import com.shoptech.modules.order.dto.OrderResponse.SellerOrderResponse;
import com.shoptech.modules.order.entity.OrderItem;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.helper.W3CDom;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Dựng hoá đơn từ đơn hàng, xuất PDF và gửi email kèm file PDF. */
@Service
@RequiredArgsConstructor
public class InvoiceService {

    private static final Map<String, String> ORDER_STATUS_LABELS = Map.of(
            "pending", "Chờ xác nhận",
            "paid", "Đã thanh toán",
            "completed", "Hoàn tất",
            "cancelled", "Đã hủy");

    private static final Map<String, String> SELLER_ORDER_STATUS_LABELS = Map.of(
            "pending", "Chờ xác nhận",
            "confirmed", "Đã xác nhận",
            "shipping", "Đang giao",
            "delivered", "Đã giao hàng",
            "completed", "Hoàn tất",
            "cancelled", "Đã hủy");

    private static final String FONT_FAMILY = "DejaVu Sans";

    private final TemplateEngine templateEngine;
    private final JavaMailSender mailSender;
    private final AppProperties props;

    public Invoice build(OrderResponse order) {
        List<Invoice.Group> groups = order.sellerOrders().stream().map(this::group).toList();
        BigDecimal subtotal = order.sellerOrders().stream()
                .map(SellerOrderResponse::subtotal).map(InvoiceService::nz).reduce(BigDecimal.ZERO, BigDecimal::add);
        var user = order.user();
        return new Invoice(
                invoiceNo(order.id()),
                Instant.now(),
                order.status(),
                ORDER_STATUS_LABELS.getOrDefault(order.status(), order.status()),
                new Invoice.Party(user == null ? "" : user.name(), user == null ? "" : user.email(),
                        user == null ? null : user.phone(), null),
                new Invoice.Party(order.receiverName(), null, order.receiverPhone(), order.shippingAddress()),
                order.paymentMethod(),
                order.paidAt(),
                order.createdAt(),
                groups,
                subtotal,
                nz(order.shippingFee()),
                nz(order.discountAmount()),
                order.discountCode(),
                nz(order.totalAmount()));
    }

    /**
     * Hoá đơn riêng phần đơn của một gian hàng (Seller Center): chỉ sản phẩm của gian hàng đó,
     * tổng = tạm tính + phí ship của phần đơn (mã giảm giá áp cho cả đơn nên không tính ở đây).
     */
    public Invoice buildForSellerOrder(OrderResponse order, Long sellerOrderId) {
        SellerOrderResponse so = order.sellerOrders().stream()
                .filter(s -> s.id().equals(sellerOrderId)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Phần đơn không thuộc đơn hàng"));
        var user = order.user();
        return new Invoice(
                invoiceNo(order.id()) + "-S" + so.id(),
                Instant.now(),
                so.status(),
                SELLER_ORDER_STATUS_LABELS.getOrDefault(so.status(), so.status()),
                new Invoice.Party(user == null ? "" : user.name(), user == null ? "" : user.email(),
                        user == null ? null : user.phone(), null),
                new Invoice.Party(order.receiverName(), null, order.receiverPhone(), order.shippingAddress()),
                order.paymentMethod(),
                order.paidAt(),
                order.createdAt(),
                List.of(group(so)),
                nz(so.subtotal()),
                nz(so.shippingFee()),
                BigDecimal.ZERO,
                null,
                nz(so.subtotal()).add(nz(so.shippingFee())));
    }

    public byte[] renderPdf(Invoice invoice) {
        String html = templateEngine.process("invoice/pdf", context(invoice));
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.useFont(() -> font("fonts/DejaVuSans.ttf"), FONT_FAMILY, 400, PdfRendererBuilder.FontStyle.NORMAL, true);
            builder.useFont(() -> font("fonts/DejaVuSans-Bold.ttf"), FONT_FAMILY, 700, PdfRendererBuilder.FontStyle.NORMAL, true);
            builder.withW3cDocument(new W3CDom().fromJsoup(Jsoup.parse(html)), "/");
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Không thể tạo file PDF hoá đơn", e);
        }
    }

    public void email(Invoice invoice, String toEmail) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(props.mail().fromAddress(), props.mail().fromName());
            helper.setTo(toEmail);
            helper.setSubject("Hóa đơn " + invoice.invoiceNo() + " — ShopTech");
            helper.setText(templateEngine.process("invoice/email", context(invoice)), true);
            helper.addAttachment(invoice.invoiceNo() + ".pdf", new ByteArrayResource(renderPdf(invoice)), "application/pdf");
            mailSender.send(message);
        } catch (MessagingException | IOException e) {
            throw new IllegalStateException("Gửi email hoá đơn thất bại", e);
        }
    }

    public static String invoiceNo(Long orderId) {
        return "DH-" + String.format("%06d", orderId);
    }

    private Invoice.Group group(SellerOrderResponse so) {
        List<OrderItem> items = so.items() == null ? List.of() : so.items();
        return new Invoice.Group(
                so.store() == null ? "—" : so.store().name(),
                so.status(),
                SELLER_ORDER_STATUS_LABELS.getOrDefault(so.status(), so.status()),
                items.stream().map(i -> new Invoice.Line(i.getProductName(), i.getSku(), nz(i.getUnitPrice()),
                        i.getQuantity() == null ? 0 : i.getQuantity(), nz(i.getLineTotal()))).toList(),
                nz(so.subtotal()),
                nz(so.shippingFee()));
    }

    private Context context(Invoice invoice) {
        Context ctx = new Context(Locale.forLanguageTag("vi"));
        ctx.setVariable("invoice", invoice);
        ctx.setVariable("fmt", new Formatter());
        return ctx;
    }

    private static InputStream font(String path) {
        try {
            return new ClassPathResource(path).getInputStream();
        } catch (IOException e) {
            throw new UncheckedIOException("Không tìm thấy font " + path, e);
        }
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    /** Hàm định dạng dùng trong template: tiền "1.234.567đ", ngày giờ theo giờ Việt Nam. */
    public static class Formatter {

        private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
        private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        public String money(BigDecimal value) {
            DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
            symbols.setGroupingSeparator('.');
            return new DecimalFormat("#,##0", symbols).format(value == null ? BigDecimal.ZERO : value) + "đ";
        }

        public String dateTime(Instant value) {
            return value == null ? "" : DATE_TIME.format(value.atZone(VN));
        }

        public String upper(String value) {
            return value == null ? "" : value.toUpperCase(Locale.ROOT);
        }
    }
}
