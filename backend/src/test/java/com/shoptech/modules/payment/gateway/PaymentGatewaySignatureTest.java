package com.shoptech.modules.payment.gateway;

import com.shoptech.config.AppProperties;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Chữ ký phải khớp tuyệt đối với thuật toán của từng cổng thanh toán. Các giá trị kỳ vọng được tính
 * sẵn bằng đúng công thức tham chiếu (khoá thử nghiệm, không phải khoá thật).
 */
class PaymentGatewaySignatureTest {

    private static final AppProperties PROPS = new AppProperties(
            "http://localhost:8000", "http://localhost:5173", "http://localhost:5175", List.of(),
            null, null, null, null,
            new AppProperties.Payment(
                    new AppProperties.Payment.Momo("https://example.test", "MOMO", "TESTACCESS", "TESTMOMOSECRET"),
                    new AppProperties.Payment.Vnpay("https://example.test", "TESTTMN", "TESTVNPAYSECRET"),
                    new AppProperties.Payment.OnePay("https://example.test", "TESTMERCHANT", "TESTACCESS",
                            "A3EFDFABA8653DF2342E8DAC29B51AF0", null),
                    new AppProperties.Payment.SePay("TESTMERCHANT", "TESTSEPAYSECRET", "https://example.test")),
            null, null);

    @Test
    void vnpayReturnSignatureMatchesReference() {
        Map<String, String> q = new HashMap<>(Map.of(
                "vnp_Amount", "150000000",
                "vnp_Command", "pay",
                "vnp_OrderInfo", "Giai ngan rut tien ShopTech #7",
                "vnp_ReturnUrl", "http://localhost:8000/api/payments/vnpay/withdrawal-return",
                "vnp_TxnRef", "WD7-1790000000",
                "vnp_TmnCode", "TESTTMN",
                "vnp_Locale", "vn"));
        q.put("vnp_SecureHash", "bf19ca2874b6fe50ad55de414d920ace52e22847b96be1375820d9d52d75ab8b"
                + "5fc4802d377eccfe7e0e9f25abb6d78bd12f09f2868d54ff9c977b22966e9545");
        VnpayGateway gateway = new VnpayGateway(PROPS);

        assertThat(gateway.verifyReturn(q)).isTrue();

        q.put("vnp_Amount", "990000000");
        assertThat(gateway.verifyReturn(q)).isFalse();
    }

    @Test
    void onepayReturnSignatureMatchesReference() {
        Map<String, String> q = new HashMap<>(Map.ofEntries(
                Map.entry("vpc_Version", "2"),
                Map.entry("vpc_Command", "pay"),
                Map.entry("vpc_MerchTxnRef", "WD7-1790000000"),
                Map.entry("vpc_Merchant", "TESTMERCHANT"),
                Map.entry("vpc_AccessCode", "TESTACCESS"),
                Map.entry("vpc_Amount", "150000000"),
                Map.entry("vpc_Currency", "VND"),
                Map.entry("vpc_Locale", "vn"),
                Map.entry("vpc_ReturnURL", "http://localhost:8000/api/payments/onepay/withdrawal-return"),
                Map.entry("vpc_OrderInfo", "Giai ngan rut tien ShopTech #7"),
                Map.entry("vpc_TicketNo", "127.0.0.1")));
        // Cổng có thể trả chữ ký viết thường — vẫn phải chấp nhận.
        q.put("vpc_SecureHash", "1db7c73a50dfc2edd6d5312b5f9d37ea9adbfbc5fbeddda944cbffd91d3c284e");

        assertThat(new OnePayGateway(PROPS).verifyReturn(q)).isTrue();
    }

    @Test
    void momoReturnSignatureMatchesReference() {
        Map<String, String> q = new HashMap<>(Map.ofEntries(
                Map.entry("amount", "1500000"),
                Map.entry("extraData", ""),
                Map.entry("message", "Successful."),
                Map.entry("orderId", "MOMO-WD7-1790000000"),
                Map.entry("orderInfo", "Giai ngan rut tien ShopTech #7"),
                Map.entry("orderType", "momo_wallet"),
                Map.entry("payType", "qr"),
                Map.entry("requestId", "MOMO-WD7-1790000000"),
                Map.entry("responseTime", "1790000001"),
                Map.entry("resultCode", "0"),
                Map.entry("transId", "4088878653"),
                Map.entry("signature", "0a107a0fb01ea73638892c90f2abc74dbe1fca78a4f747ae34d9123995ec472a")));
        MomoGateway gateway = new MomoGateway(PROPS);

        assertThat(gateway.verifyReturn(q)).isTrue();
        assertThat(gateway.isSuccess(q)).isTrue();

        q.put("resultCode", "1006");
        assertThat(gateway.verifyReturn(q)).isFalse();
    }

    @Test
    void sepayCheckoutSignatureMatchesReference() {
        var form = new SePayGateway(PROPS).checkoutForm("WD7-1790000000", 1_500_000,
                "Giai ngan rut tien ShopTech #7", "http://x/s", "http://x/e", "http://x/c");

        assertThat(form.fields().get("signature")).isEqualTo("FVI2624EvuH+JLGsn5N/QgKiRZyIJuI6XyRqxeiMiJc=");
        assertThat(form.fields().get("order_amount")).isEqualTo("1500000");
    }
}
