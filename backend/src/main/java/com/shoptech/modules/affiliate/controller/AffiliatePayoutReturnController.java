package com.shoptech.modules.affiliate.controller;

import com.shoptech.modules.affiliate.service.AffiliateService;
import com.shoptech.modules.payment.gateway.MomoGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

/** MoMo chuyển trình duyệt của người bán về đây sau khi chi trả hoa hồng: kiểm tra chữ ký rồi ghi nhận và quay lại trang quản lý. */
@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class AffiliatePayoutReturnController {

    private final AffiliateService affiliateService;
    private final MomoGateway momoGateway;

    @GetMapping("/momo/affiliate-return")
    public ResponseEntity<Void> momo(@RequestParam Map<String, String> q) {
        boolean ok = momoGateway.verifyReturn(q) && momoGateway.isSuccess(q)
                && affiliateService.finalizeByReference(q.get("orderId"));
        if (!ok) {
            log.warn("MoMo affiliate-return không hợp lệ hoặc thất bại: orderId={}", q.get("orderId"));
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(affiliateService.sellerRedirect(ok)));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
