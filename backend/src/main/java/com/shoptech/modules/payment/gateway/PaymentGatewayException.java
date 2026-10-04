package com.shoptech.modules.payment.gateway;

/** Lỗi khi gọi cổng thanh toán (mạng, cấu hình, cổng từ chối yêu cầu). */
public class PaymentGatewayException extends RuntimeException {

    public PaymentGatewayException(String message) {
        super(message);
    }

    public PaymentGatewayException(String message, Throwable cause) {
        super(message, cause);
    }
}
