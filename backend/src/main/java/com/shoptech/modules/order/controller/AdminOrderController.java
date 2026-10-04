package com.shoptech.modules.order.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.order.dto.Invoice;
import com.shoptech.modules.order.dto.OrderResponse;
import com.shoptech.modules.order.service.AdminOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    @GetMapping
    @PreAuthorize("@access.module('orders', 'view')")
    public ApiResponse<PagedResult<OrderResponse>> index(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(adminOrderService.list(status, page, perPage));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@access.module('orders', 'view')")
    public ApiResponse<OrderResponse> show(@PathVariable Long id) {
        return ApiResponse.ok(adminOrderService.detail(id));
    }

    /** Mở hoá đơn PDF ngay trên trình duyệt. */
    @GetMapping("/{id}/invoice/pdf")
    @PreAuthorize("@access.module('orders', 'view')")
    public ResponseEntity<byte[]> invoicePdf(@PathVariable Long id) {
        Invoice invoice = adminOrderService.invoice(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(invoice.invoiceNo() + ".pdf").build().toString())
                .body(adminOrderService.invoicePdf(invoice));
    }

    @PostMapping("/{id}/invoice/email")
    @PreAuthorize("@access.module('orders', 'edit')")
    public ApiResponse<Void> emailInvoice(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        adminOrderService.emailInvoice(id, body == null ? null : body.get("email"));
        return ApiResponse.message("Đã gửi hóa đơn qua email");
    }
}
