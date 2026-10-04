package com.shoptech.modules.order.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.response.PagedResult;
import com.shoptech.common.response.Pagination;
import com.shoptech.modules.order.dto.Invoice;
import com.shoptech.modules.order.dto.OrderResponse;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminOrderService {

    private static final int PER_PAGE = 15;
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final OrderRepository orderRepository;
    private final OrderViewService orderViewService;
    private final InvoiceService invoiceService;

    public PagedResult<OrderResponse> list(String status, Integer page, Integer perPage) {
        Page<Order> orders = orderRepository.search(blankToNull(status),
                Pagination.of(page, perPage, PER_PAGE, Sort.by("createdAt").descending()));
        var content = orderViewService.build(orders.getContent(), true, false);
        return PagedResult.of(new PageImpl<>(content, orders.getPageable(), orders.getTotalElements()));
    }

    public OrderResponse detail(Long id) {
        return orderViewService.build(find(id), true, true);
    }

    public Invoice invoice(Long id) {
        return invoiceService.build(detail(id));
    }

    public byte[] invoicePdf(Invoice invoice) {
        return invoiceService.renderPdf(invoice);
    }

    /** Gửi hoá đơn tới email chỉ định, mặc định là email của khách đặt đơn. */
    public void emailInvoice(Long id, String email) {
        Invoice invoice = invoice(id);
        String to = email == null || email.isBlank() ? invoice.customer().email() : email.trim();
        if (to == null || !EMAIL.matcher(to).matches()) {
            throw ValidationException.of("email", "Email không hợp lệ");
        }
        invoiceService.email(invoice, to);
    }

    private Order find(Long id) {
        return orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
