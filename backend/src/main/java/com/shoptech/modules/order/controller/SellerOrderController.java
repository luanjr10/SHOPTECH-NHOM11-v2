package com.shoptech.modules.order.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PagedResult;
import com.shoptech.modules.order.dto.Invoice;
import com.shoptech.modules.order.dto.SellerOrderView;
import com.shoptech.modules.order.service.SellerOrderService;
import com.shoptech.modules.seller.service.SellerContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Seller Center — đơn hàng & hoá đơn của gian hàng. */
@RestController
@RequestMapping("/api/seller/stores/{storeId}/orders")
@RequiredArgsConstructor
public class SellerOrderController {

    private final SellerContext seller;
    private final SellerOrderService orderService;

    @GetMapping
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<PagedResult<SellerOrderView>> index(
            @PathVariable Long storeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(orderService.list(seller.store(storeId), status, page, perPage));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<SellerOrderView> show(@PathVariable Long storeId, @PathVariable Long id) {
        return ApiResponse.ok(orderService.detail(seller.store(storeId), id));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<SellerOrderView> updateStatus(@PathVariable Long storeId, @PathVariable Long id,
                                                     @RequestBody(required = false) Map<String, String> body) {
        return ApiResponse.ok("Cập nhật trạng thái đơn thành công",
                orderService.updateStatus(seller.store(storeId), id, body == null ? null : body.get("status")));
    }

    @PostMapping("/{id}/handover")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<SellerOrderView> handover(@PathVariable Long storeId, @PathVariable Long id) {
        return ApiResponse.ok("Đã bàn giao vận chuyển — vui lòng tự giao hàng cho khách.",
                orderService.handover(seller.store(storeId), id));
    }

    @PostMapping("/{id}/driver-mark-delivered")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<SellerOrderView> markDelivered(@PathVariable Long storeId, @PathVariable Long id) {
        return ApiResponse.ok("Đã đánh dấu giao hàng thành công — chờ khách xác nhận để nhận tiền.",
                orderService.markDeliveredByDriver(seller.store(storeId), id));
    }

    @PostMapping("/{id}/driver-mark-cancelled")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<SellerOrderView> markCancelled(@PathVariable Long storeId, @PathVariable Long id) {
        return ApiResponse.ok("Đã hủy đơn.", orderService.markCancelledByDriver(seller.store(storeId), id));
    }

    /** Mở hoá đơn PDF ngay trên trình duyệt. */
    @GetMapping("/{id}/invoice/pdf")
    @PreAuthorize("@seller.owns(#storeId)")
    public ResponseEntity<byte[]> invoicePdf(@PathVariable Long storeId, @PathVariable Long id) {
        Invoice invoice = orderService.invoice(seller.store(storeId), id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(invoice.invoiceNo() + ".pdf").build().toString())
                .body(orderService.invoicePdf(invoice));
    }

    @PostMapping("/{id}/invoice/email")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Void> emailInvoice(@PathVariable Long storeId, @PathVariable Long id,
                                          @RequestBody(required = false) Map<String, String> body) {
        orderService.emailInvoice(seller.store(storeId), id, body == null ? null : body.get("email"));
        return ApiResponse.message("Đã gửi hóa đơn qua email");
    }
}
