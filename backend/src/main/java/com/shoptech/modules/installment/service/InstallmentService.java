package com.shoptech.modules.installment.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.mail.MailService;
import com.shoptech.common.util.Json;
import com.shoptech.config.AppProperties;
import com.shoptech.modules.coupon.service.CouponApplyService;
import com.shoptech.modules.customer.service.CustomerTiers;
import com.shoptech.modules.order.entity.Order;
import com.shoptech.modules.payment.gateway.MomoGateway;
import com.shoptech.modules.payment.gateway.PaymentGatewayException;
import com.shoptech.modules.withdrawal.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.Timestamp;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Trả góp do từng gian hàng cho vay: gian hàng tự bật, đặt kỳ hạn và lãi, rồi tự quyết định có chấp nhận từng
 * yêu cầu của khách hay không. Khách trả từng kỳ qua MoMo sandbox; tiền mỗi kỳ (trừ hoa hồng sàn trên phần gốc)
 * về ví của gian hàng, nên gian hàng là bên chịu rủi ro tín dụng và hưởng toàn bộ tiền lãi.
 */
@Service
@RequiredArgsConstructor
public class InstallmentService {

    public static final int MAX_TERMS = 6;
    public static final BigDecimal DEFAULT_MIN_ORDER = BigDecimal.valueOf(3_000_000);
    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final NamedParameterJdbcTemplate jdbc;
    private final WalletService walletService;
    private final MomoGateway momoGateway;
    private final MailService mailService;
    private final AppProperties props;
    private final Json json;

    public record Term(int months, double monthlyRate) {
    }

    public record Settings(boolean enabled, BigDecimal minOrder, List<Term> options) {
    }

    // ------------------------------------------------------------------ điều kiện gian hàng

    @Transactional(readOnly = true)
    public Settings settingsFor(Long storeId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT enabled, min_order, terms FROM store_installment_settings WHERE store_id = :s",
                new MapSqlParameterSource("s", storeId));
        List<Term> terms = new ArrayList<>(List.of(new Term(3, 0.0), new Term(6, 0.8), new Term(12, 1.2)));
        boolean enabled = false;
        BigDecimal minOrder = DEFAULT_MIN_ORDER;
        if (!rows.isEmpty()) {
            Map<String, Object> row = rows.get(0);
            enabled = Boolean.TRUE.equals(row.get("enabled")) || Integer.valueOf(1).equals(row.get("enabled"));
            minOrder = (BigDecimal) row.get("min_order");
            List<Map<String, Object>> stored = json.mapListOf(row.get("terms") == null ? null : row.get("terms").toString());
            if (!stored.isEmpty()) {
                terms = stored.stream().map(t -> new Term(((Number) t.get("months")).intValue(),
                        ((Number) t.get("monthly_rate")).doubleValue())).collect(java.util.stream.Collectors.toCollection(ArrayList::new));
            }
        }
        terms.sort(Comparator.comparingInt(Term::months));
        return new Settings(enabled, minOrder, terms);
    }

    @Transactional
    public Settings updateSettings(Long storeId, boolean enabled, BigDecimal minOrder, List<Term> terms) {
        List<Term> sorted = terms.stream().sorted(Comparator.comparingInt(Term::months)).toList();
        List<Map<String, Object>> stored = sorted.stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("months", t.months());
            m.put("monthly_rate", t.monthlyRate());
            return m;
        }).toList();
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO store_installment_settings (store_id, enabled, min_order, terms, created_at, updated_at)
                VALUES (:s, :e, :m, :t, :now, :now)
                ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), min_order = VALUES(min_order),
                                        terms = VALUES(terms), updated_at = VALUES(updated_at)
                """, new MapSqlParameterSource().addValue("s", storeId).addValue("e", enabled).addValue("m", minOrder)
                .addValue("t", json.write(stored)).addValue("now", now));
        return settingsFor(storeId);
    }

    // ------------------------------------------------------------------ báo giá lịch trả

    /** Lãi phẳng theo tháng; kỳ cuối nhận phần dư để tổng khớp tuyệt đối. */
    public Map<String, Object> quote(BigDecimal principalRaw, int months, double monthlyRate) {
        BigDecimal principal = principalRaw.setScale(0, RoundingMode.HALF_UP);
        BigDecimal totalInterest = principal.multiply(BigDecimal.valueOf(monthlyRate)).movePointLeft(2)
                .multiply(BigDecimal.valueOf(months)).setScale(0, RoundingMode.HALF_UP);
        List<Map<String, Object>> schedule = new ArrayList<>();
        BigDecimal principalLeft = principal;
        BigDecimal interestLeft = totalInterest;
        for (int n = 1; n <= months; n++) {
            boolean last = n == months;
            BigDecimal principalPart = last ? principalLeft
                    : principal.divide(BigDecimal.valueOf(months), 0, RoundingMode.FLOOR);
            BigDecimal interestPart = last ? interestLeft
                    : totalInterest.divide(BigDecimal.valueOf(months), 0, RoundingMode.HALF_UP);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("number", n);
            row.put("amount", principalPart.add(interestPart));
            row.put("principal_part", principalPart);
            row.put("interest_part", interestPart);
            schedule.add(row);
            principalLeft = principalLeft.subtract(principalPart);
            interestLeft = interestLeft.subtract(interestPart);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("months", months);
        out.put("monthly_rate", monthlyRate);
        out.put("principal", principal);
        out.put("total_interest", totalInterest);
        out.put("total_payable", principal.add(totalInterest));
        out.put("schedule", schedule);
        return out;
    }

    // ------------------------------------------------------------------ điều kiện của khách

    @Transactional(readOnly = true)
    public boolean hasOverdue(Long userId) {
        return count("""
                SELECT COUNT(*) FROM installment_payments p JOIN installment_plans pl ON pl.id = p.plan_id
                WHERE p.status = 'pending' AND p.due_date < :today AND pl.user_id = :u AND pl.status = 'active'
                """, new MapSqlParameterSource().addValue("u", userId).addValue("today", Date.valueOf(todayVn()))) > 0;
    }

    @Transactional(readOnly = true)
    public BigDecimal outstandingPrincipal(Long userId) {
        BigDecimal v = jdbc.queryForObject("""
                SELECT COALESCE(SUM(p.principal_part), 0) FROM installment_payments p JOIN installment_plans pl ON pl.id = p.plan_id
                WHERE p.status = 'pending' AND pl.user_id = :u AND pl.status = 'active'
                """, new MapSqlParameterSource("u", userId), BigDecimal.class);
        return v == null ? BigDecimal.ZERO : v;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> summary(Long userId) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("has_overdue", hasOverdue(userId));
        out.put("outstanding", outstandingPrincipal(userId));
        return out;
    }

    /** Tạo yêu cầu trả góp (chờ gian hàng duyệt) cho đơn hàng của đúng một gian hàng. */
    @Transactional
    public void createRequest(Order order, Long userId, int months) {
        List<Map<String, Object>> parts = jdbc.queryForList("SELECT id, store_id FROM seller_orders WHERE order_id = :o",
                new MapSqlParameterSource("o", order.getId()));
        if (parts.size() != 1) {
            throw ApiException.unprocessable("Trả góp chỉ áp dụng cho đơn hàng của một gian hàng. Hãy tách đơn theo từng gian hàng.");
        }
        long storeId = ((Number) parts.get(0).get("store_id")).longValue();
        long sellerOrderId = ((Number) parts.get(0).get("id")).longValue();
        BigDecimal principal = order.getTotalAmount();

        Settings settings = settingsFor(storeId);
        String storeName = jdbc.queryForList("SELECT name FROM stores WHERE id = :id", new MapSqlParameterSource("id", storeId), String.class)
                .stream().findFirst().orElse("");
        if (!settings.enabled()) {
            throw ApiException.unprocessable("Gian hàng " + storeName + " hiện không nhận bán trả góp.");
        }
        if (principal.compareTo(settings.minOrder()) < 0) {
            throw ApiException.unprocessable("Gian hàng này chỉ bán trả góp cho đơn từ " + money(settings.minOrder()) + "đ.");
        }
        Term option = settings.options().stream().filter(t -> t.months() == months).findFirst()
                .orElseThrow(() -> ApiException.unprocessable("Gian hàng này không có kỳ hạn trả góp " + months + " tháng."));
        if (hasOverdue(userId)) {
            throw ApiException.unprocessable("Bạn đang có kỳ trả góp quá hạn, vui lòng thanh toán trước khi đăng ký thêm.");
        }

        Map<String, Object> quote = quote(principal, months, option.monthlyRate());
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO installment_plans (order_id, user_id, store_id, seller_order_id, principal, months, monthly_rate,
                    total_interest, total_payable, status, created_at, updated_at)
                VALUES (:o, :u, :s, :so, :p, :m, :r, :ti, :tp, 'pending_approval', :now, :now)
                """, new MapSqlParameterSource().addValue("o", order.getId()).addValue("u", userId).addValue("s", storeId)
                .addValue("so", sellerOrderId).addValue("p", quote.get("principal")).addValue("m", months)
                .addValue("r", option.monthlyRate()).addValue("ti", quote.get("total_interest"))
                .addValue("tp", quote.get("total_payable")).addValue("now", now));
        Long planId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", new MapSqlParameterSource(), Long.class);

        LocalDate start = todayVn();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> schedule = (List<Map<String, Object>>) quote.get("schedule");
        for (Map<String, Object> row : schedule) {
            int number = (Integer) row.get("number");
            jdbc.update("""
                    INSERT INTO installment_payments (plan_id, number, amount, principal_part, interest_part, due_date, status,
                        created_at, updated_at)
                    VALUES (:plan, :n, :a, :pp, :ip, :due, 'pending', :now, :now)
                    """, new MapSqlParameterSource().addValue("plan", planId).addValue("n", number)
                    .addValue("a", row.get("amount")).addValue("pp", row.get("principal_part"))
                    .addValue("ip", row.get("interest_part")).addValue("due", Date.valueOf(start.plusMonths(number - 1L)))
                    .addValue("now", now));
        }
    }

    // ------------------------------------------------------------------ gian hàng quyết định

    /** Chấp nhận cho vay. */
    @Transactional
    public void approve(Long storeId, Long planId, String note) {
        Map<String, Object> plan = pendingPlan(storeId, planId);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("UPDATE installment_plans SET status = 'active', decided_at = :now, decision_note = :n, updated_at = :now WHERE id = :id",
                new MapSqlParameterSource().addValue("now", now).addValue("n", note).addValue("id", plan.get("id")));
        notifyDecision(planId, true);
    }

    /** Từ chối cho vay: đóng khoản vay (người gọi chịu trách nhiệm huỷ đơn hàng đi kèm). @return order_id và user_id */
    @Transactional
    public Map<String, Object> reject(Long storeId, Long planId, String note) {
        Map<String, Object> plan = pendingPlan(storeId, planId);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("UPDATE installment_payments SET status = 'cancelled', updated_at = :now WHERE plan_id = :id AND status = 'pending'",
                new MapSqlParameterSource().addValue("now", now).addValue("id", planId));
        jdbc.update("UPDATE installment_plans SET status = 'rejected', decided_at = :now, decision_note = :n, updated_at = :now WHERE id = :id",
                new MapSqlParameterSource().addValue("now", now).addValue("n", note).addValue("id", planId));
        return plan;
    }

    /** Gửi mail kết quả cho khách (không làm hỏng luồng chính nếu SMTP lỗi). */
    public void notifyDecision(Long planId, boolean approved) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT pl.order_id, pl.months, pl.principal, pl.decision_note, u.email, u.name, s.name AS store_name
                FROM installment_plans pl JOIN users u ON u.id = pl.user_id LEFT JOIN stores s ON s.id = pl.store_id
                WHERE pl.id = :id
                """, new MapSqlParameterSource("id", planId));
        if (rows.isEmpty() || rows.get(0).get("email") == null) {
            return;
        }
        Map<String, Object> r = rows.get(0);
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("name", r.get("name") == null ? "" : r.get("name"));
        vars.put("approved", approved);
        vars.put("storeName", r.get("store_name") == null ? "Gian hàng" : r.get("store_name"));
        vars.put("orderId", r.get("order_id"));
        vars.put("months", r.get("months"));
        vars.put("amount", money((BigDecimal) r.get("principal")) + "đ");
        vars.put("note", r.get("decision_note") == null ? "" : r.get("decision_note"));
        vars.put("url", props.frontendUrl().replaceAll("/+$", "") + "/tai-khoan/tra-gop");
        mailService.sendQuietly((String) r.get("email"),
                (approved ? "Yêu cầu trả góp được chấp nhận" : "Yêu cầu trả góp bị từ chối") + " — ShopTech",
                "installment-decision", vars);
    }

    // ------------------------------------------------------------------ thanh toán từng kỳ

    /** Khách bấm "Thanh toán" một kỳ → link MoMo sandbox. */
    @Transactional
    public String createPaymentUrl(Long userId, Long paymentId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.id, p.number, p.amount, p.status AS pay_status, pl.id AS plan_id, pl.user_id, pl.status AS plan_status, pl.order_id, pl.months
                FROM installment_payments p JOIN installment_plans pl ON pl.id = p.plan_id WHERE p.id = :id
                """, new MapSqlParameterSource("id", paymentId));
        if (rows.isEmpty() || ((Number) rows.get(0).get("user_id")).longValue() != userId) {
            throw ApiException.notFound("Không tìm thấy kỳ trả góp");
        }
        Map<String, Object> p = rows.get(0);
        if ("pending_approval".equals(p.get("plan_status"))) {
            throw ApiException.unprocessable("Gian hàng chưa duyệt yêu cầu trả góp này");
        }
        if (!"pending".equals(p.get("pay_status")) || !"active".equals(p.get("plan_status"))) {
            throw ApiException.unprocessable("Kỳ trả góp này không còn cần thanh toán");
        }
        long earlier = count("SELECT COUNT(*) FROM installment_payments WHERE plan_id = :plan AND number < :n AND status = 'pending'",
                new MapSqlParameterSource().addValue("plan", p.get("plan_id")).addValue("n", p.get("number")));
        if (earlier > 0) {
            throw ApiException.unprocessable("Vui lòng thanh toán các kỳ trước theo thứ tự");
        }

        String ref = momoGateway.partnerCode() + "-IP" + paymentId + "-" + Instant.now().getEpochSecond();
        long amount = ((BigDecimal) p.get("amount")).setScale(0, RoundingMode.HALF_UP).longValue();
        String back = props.backendUrl("/api/payments/momo/installment-return");
        try {
            String url = momoGateway.createPaymentUrl(ref, amount, "Tra gop ShopTech don #" + p.get("order_id")
                    + " ky " + p.get("number") + "/" + p.get("months"), back, back);
            jdbc.update("UPDATE installment_payments SET payment_ref = :ref WHERE id = :id",
                    new MapSqlParameterSource().addValue("ref", ref).addValue("id", paymentId));
            return url;
        } catch (PaymentGatewayException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
    }

    /**
     * MoMo báo kết quả (redirect GET hoặc IPN POST): kiểm chữ ký, ghi nhận kỳ đã trả và kích hoạt đơn khi trả kỳ 1.
     * @return true nếu thanh toán hợp lệ và thành công
     */
    @Transactional
    public boolean handleMomo(Map<String, String> params) {
        boolean valid = momoGateway.verifyReturn(params);
        boolean success = valid && momoGateway.isSuccess(params);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.id, p.number, pl.order_id FROM installment_payments p JOIN installment_plans pl ON pl.id = p.plan_id
                WHERE p.payment_ref = :ref
                """, new MapSqlParameterSource("ref", params.get("orderId")));
        if (rows.isEmpty() || !success) {
            return false;
        }
        long paymentId = ((Number) rows.get(0).get("id")).longValue();
        long orderId = ((Number) rows.get(0).get("order_id")).longValue();
        markPaid(paymentId);
        if (((Number) rows.get(0).get("number")).intValue() == 1) {
            jdbc.update("UPDATE orders SET status = 'paid', paid_at = :now, updated_at = :now WHERE id = :id AND status = 'pending' AND paid_at IS NULL",
                    new MapSqlParameterSource().addValue("now", Timestamp.from(Instant.now())).addValue("id", orderId));
        }
        return true;
    }

    /** Ghi nhận kỳ đã trả (idempotent) và chuyển tiền vào ví gian hàng. */
    @Transactional
    public void markPaid(Long paymentId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.status, p.number, p.amount, p.principal_part, pl.id AS plan_id, pl.order_id, pl.months, pl.seller_order_id
                FROM installment_payments p JOIN installment_plans pl ON pl.id = p.plan_id WHERE p.id = :id FOR UPDATE
                """, new MapSqlParameterSource("id", paymentId));
        if (rows.isEmpty() || !"pending".equals(rows.get(0).get("status"))) {
            return;
        }
        Map<String, Object> p = rows.get(0);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("UPDATE installment_payments SET status = 'paid', paid_at = :now, updated_at = :now WHERE id = :id",
                new MapSqlParameterSource().addValue("now", now).addValue("id", paymentId));
        creditStoreWallet(paymentId, p);
        long unpaid = count("SELECT COUNT(*) FROM installment_payments WHERE plan_id = :plan AND status <> 'paid'",
                new MapSqlParameterSource("plan", p.get("plan_id")));
        if (unpaid == 0) {
            jdbc.update("UPDATE installment_plans SET status = 'completed', updated_at = :now WHERE id = :id",
                    new MapSqlParameterSource().addValue("now", now).addValue("id", p.get("plan_id")));
        }
    }

    /** Tiền mỗi kỳ về ví gian hàng, trừ hoa hồng sàn tính trên phần gốc của kỳ đó (lãi thuộc gian hàng). */
    private void creditStoreWallet(Long paymentId, Map<String, Object> p) {
        if (p.get("seller_order_id") == null) {
            return;
        }
        List<Map<String, Object>> so = jdbc.queryForList("SELECT seller_profile_id, commission_rate FROM seller_orders WHERE id = :id",
                new MapSqlParameterSource("id", p.get("seller_order_id")));
        if (so.isEmpty()) {
            return;
        }
        BigDecimal rate = (BigDecimal) so.get(0).get("commission_rate");
        BigDecimal commission = ((BigDecimal) p.get("principal_part")).multiply(rate).movePointLeft(2).setScale(2, RoundingMode.HALF_UP);
        BigDecimal net = ((BigDecimal) p.get("amount")).subtract(commission).setScale(2, RoundingMode.HALF_UP);
        if (net.signum() <= 0) {
            return;
        }
        walletService.creditAvailable(((Number) so.get(0).get("seller_profile_id")).longValue(), net, "installment_payment",
                paymentId, "Khách trả góp đơn #" + p.get("order_id") + " kỳ " + p.get("number") + "/" + p.get("months"));
    }

    /** Huỷ đơn: đóng khoản vay chưa hoàn tất và các kỳ chưa trả. (Hoàn tiền kỳ đã trả là thủ công.) */
    @Transactional
    public void cancelForOrder(Long orderId) {
        List<Map<String, Object>> plans = jdbc.queryForList(
                "SELECT id FROM installment_plans WHERE order_id = :o AND status IN ('pending_approval', 'active')",
                new MapSqlParameterSource("o", orderId));
        if (plans.isEmpty()) {
            return;
        }
        Timestamp now = Timestamp.from(Instant.now());
        Object planId = plans.get(0).get("id");
        jdbc.update("UPDATE installment_payments SET status = 'cancelled', updated_at = :now WHERE plan_id = :p AND status = 'pending'",
                new MapSqlParameterSource().addValue("now", now).addValue("p", planId));
        jdbc.update("UPDATE installment_plans SET status = 'cancelled', updated_at = :now WHERE id = :p",
                new MapSqlParameterSource().addValue("now", now).addValue("p", planId));
    }

    /** Các kỳ của khoản trả góp gắn với đơn (id + số kỳ) để client mở thanh toán kỳ 1 ngay sau khi đặt. */
    @Transactional(readOnly = true)
    public Map<String, Object> planBrief(Long orderId) {
        List<Map<String, Object>> payments = jdbc.queryForList("""
                SELECT p.id, p.number FROM installment_payments p JOIN installment_plans pl ON pl.id = p.plan_id
                WHERE pl.order_id = :o ORDER BY p.number
                """, new MapSqlParameterSource("o", orderId));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("payments", payments);
        return out;
    }

    /** Đơn trả góp: tiền về ví theo từng kỳ nên không giữ/nhả một lần như đơn thường. */
    @Transactional(readOnly = true)
    public boolean isInstallmentOrder(Long orderId) {
        return count("SELECT COUNT(*) FROM orders WHERE id = :o AND payment_method = 'installment'", new MapSqlParameterSource("o", orderId)) > 0;
    }

    // ------------------------------------------------------------------ đọc

    @Transactional(readOnly = true)
    public List<Map<String, Object>> plansOfUser(Long userId) {
        List<Map<String, Object>> plans = jdbc.queryForList("""
                SELECT pl.*, s.name AS store_name, s.slug AS store_slug FROM installment_plans pl
                LEFT JOIN stores s ON s.id = pl.store_id WHERE pl.user_id = :u ORDER BY pl.created_at DESC, pl.id DESC
                """, new MapSqlParameterSource("u", userId));
        return plans.stream().map(plan -> planView(plan, false)).toList();
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> plansOfStore(Long storeId, String status, boolean overdueOnly, int page, int perPage) {
        MapSqlParameterSource p = new MapSqlParameterSource("s", storeId).addValue("today", Date.valueOf(todayVn()));
        String where = " WHERE pl.store_id = :s";
        if (status != null && !status.isBlank()) {
            where += " AND pl.status = :st";
            p.addValue("st", status);
        }
        if (overdueOnly) {
            where += " AND pl.status = 'active' AND EXISTS (SELECT 1 FROM installment_payments x WHERE x.plan_id = pl.id AND x.status = 'pending' AND x.due_date < :today)";
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM installment_plans pl" + where, p, Long.class);
        p.addValue("limit", perPage).addValue("offset", (long) (page - 1) * perPage);
        List<Map<String, Object>> plans = jdbc.queryForList("""
                SELECT pl.*, u.id AS customer_id, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
                FROM installment_plans pl JOIN users u ON u.id = pl.user_id
                """ + where + " ORDER BY pl.created_at DESC, pl.id DESC LIMIT :limit OFFSET :offset", p);
        List<Map<String, Object>> views = new ArrayList<>();
        for (Map<String, Object> plan : plans) {
            Map<String, Object> view = planView(plan, true);
            Map<String, Object> customer = new LinkedHashMap<>();
            customer.put("id", plan.get("customer_id"));
            customer.put("name", plan.get("customer_name"));
            customer.put("email", plan.get("customer_email"));
            customer.put("phone", plan.get("customer_phone"));
            view.put("customer", customer);
            view.put("customer_profile", "pending_approval".equals(plan.get("status"))
                    ? customerProfile(((Number) plan.get("customer_id")).longValue(), storeId) : null);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> payments = (List<Map<String, Object>>) view.get("payments");
            view.put("overdue_count", payments.stream().filter(x -> Boolean.TRUE.equals(x.get("is_overdue"))).count());
            views.add(view);
        }
        return new PageImpl<>(views, PageRequest.of(page - 1, perPage), total == null ? 0 : total);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> storeStats(Long storeId) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("pending_approval", count("SELECT COUNT(*) FROM installment_plans WHERE store_id = :s AND status = 'pending_approval'",
                new MapSqlParameterSource("s", storeId)));
        out.put("active_plans", count("SELECT COUNT(*) FROM installment_plans WHERE store_id = :s AND status = 'active'",
                new MapSqlParameterSource("s", storeId)));
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detail(Long planId) {
        List<Map<String, Object>> plans = jdbc.queryForList("""
                SELECT pl.*, s.name AS store_name, s.slug AS store_slug FROM installment_plans pl
                LEFT JOIN stores s ON s.id = pl.store_id WHERE pl.id = :id
                """, new MapSqlParameterSource("id", planId));
        return plans.isEmpty() ? null : planView(plans.get(0), false);
    }

    private Map<String, Object> planView(Map<String, Object> plan, boolean forStore) {
        long planId = ((Number) plan.get("id")).longValue();
        long orderId = ((Number) plan.get("order_id")).longValue();
        LocalDate today = todayVn();
        List<Map<String, Object>> payments = jdbc.queryForList(
                "SELECT * FROM installment_payments WHERE plan_id = :p ORDER BY number", new MapSqlParameterSource("p", planId));
        BigDecimal paid = BigDecimal.ZERO;
        BigDecimal remaining = BigDecimal.ZERO;
        List<Map<String, Object>> paymentViews = new ArrayList<>();
        for (Map<String, Object> pay : payments) {
            Map<String, Object> v = new LinkedHashMap<>();
            v.put("id", pay.get("id"));
            v.put("number", pay.get("number"));
            v.put("amount", pay.get("amount"));
            v.put("principal_part", pay.get("principal_part"));
            v.put("interest_part", pay.get("interest_part"));
            LocalDate due = ((Date) pay.get("due_date")).toLocalDate();
            v.put("due_date", due.toString());
            v.put("status", pay.get("status"));
            v.put("paid_at", pay.get("paid_at") == null ? null : ((Timestamp) pay.get("paid_at")).toInstant().toString());
            v.put("is_overdue", "pending".equals(pay.get("status")) && due.isBefore(today));
            paymentViews.add(v);
            if ("paid".equals(pay.get("status"))) {
                paid = paid.add((BigDecimal) pay.get("amount"));
            } else if ("pending".equals(pay.get("status"))) {
                remaining = remaining.add((BigDecimal) pay.get("amount"));
            }
        }
        List<String> productNames = jdbc.queryForList("""
                SELECT oi.product_name FROM order_items oi JOIN seller_orders so ON so.id = oi.seller_order_id
                WHERE so.order_id = :o ORDER BY oi.id
                """, new MapSqlParameterSource("o", orderId), String.class);

        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", planId);
        v.put("order_id", orderId);
        v.put("store_id", plan.get("store_id"));
        if (!forStore) {
            Map<String, Object> store = new LinkedHashMap<>();
            store.put("id", plan.get("store_id"));
            store.put("name", plan.get("store_name"));
            store.put("slug", plan.get("store_slug"));
            v.put("store", plan.get("store_id") == null ? null : store);
        }
        v.put("status", plan.get("status"));
        v.put("decision_note", plan.get("decision_note"));
        v.put("decided_at", plan.get("decided_at") == null ? null : ((Timestamp) plan.get("decided_at")).toInstant().toString());
        v.put("principal", plan.get("principal"));
        v.put("months", plan.get("months"));
        v.put("monthly_rate", plan.get("monthly_rate"));
        v.put("total_interest", plan.get("total_interest"));
        v.put("total_payable", plan.get("total_payable"));
        v.put("paid_amount", paid);
        v.put("remaining_amount", remaining);
        v.put("product_names", productNames);
        v.put("created_at", plan.get("created_at") == null ? null : ((Timestamp) plan.get("created_at")).toInstant().toString());
        v.put("payments", paymentViews);
        return v;
    }

    /** Thông tin giúp gian hàng cân nhắc cho vay. */
    public Map<String, Object> customerProfile(Long customerId, Long storeId) {
        BigDecimal spent = jdbc.queryForObject("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = :u AND status = :s",
                new MapSqlParameterSource().addValue("u", customerId).addValue("s", CustomerTiers.COUNTED_STATUS), BigDecimal.class);
        CustomerTiers.Tier tier = CustomerTiers.resolve(spent == null ? BigDecimal.ZERO : spent);
        List<Map<String, Object>> user = jdbc.queryForList("SELECT email_verified_at, created_at FROM users WHERE id = :u",
                new MapSqlParameterSource("u", customerId));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tier", tier.label());
        out.put("total_spent", spent);
        out.put("email_verified", !user.isEmpty() && user.get(0).get("email_verified_at") != null);
        out.put("member_since", user.isEmpty() || user.get(0).get("created_at") == null ? null
                : ((Timestamp) user.get(0).get("created_at")).toInstant().toString());
        out.put("completed_orders_here", count("""
                SELECT COUNT(DISTINCT o.id) FROM orders o JOIN seller_orders so ON so.order_id = o.id
                WHERE o.user_id = :u AND so.store_id = :s AND so.status = 'completed'
                """, new MapSqlParameterSource().addValue("u", customerId).addValue("s", storeId)));
        out.put("completed_plans", count("SELECT COUNT(*) FROM installment_plans WHERE user_id = :u AND status = 'completed'",
                new MapSqlParameterSource("u", customerId)));
        out.put("has_overdue", hasOverdue(customerId));
        out.put("outstanding", outstandingPrincipal(customerId));
        return out;
    }

    // ------------------------------------------------------------------ nhắc nợ

    /** Gửi email nhắc kỳ sắp đến hạn (một lần) và kỳ đã quá hạn (mỗi ngày một lần). @return số email đã gửi */
    @Transactional
    public int sendReminders(int daysBefore) {
        LocalDate today = todayVn();
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.id, p.number, p.amount, p.due_date, p.reminded_at, pl.order_id, pl.months, u.email, u.name
                FROM installment_payments p JOIN installment_plans pl ON pl.id = p.plan_id JOIN users u ON u.id = pl.user_id
                WHERE p.status = 'pending' AND p.due_date <= :soon AND pl.status = 'active' AND p.number <> 1
                """, new MapSqlParameterSource("soon", Date.valueOf(today.plusDays(daysBefore))));
        int sent = 0;
        for (Map<String, Object> r : rows) {
            LocalDate due = ((Date) r.get("due_date")).toLocalDate();
            boolean overdue = due.isBefore(today);
            Timestamp remindedAt = (Timestamp) r.get("reminded_at");
            boolean already = remindedAt != null && (!overdue
                    || remindedAt.toInstant().atZone(CouponApplyService.VN).toLocalDate().equals(today));
            if (already || r.get("email") == null) {
                continue;
            }
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("name", r.get("name") == null ? "" : r.get("name"));
            vars.put("number", r.get("number"));
            vars.put("months", r.get("months"));
            vars.put("orderId", r.get("order_id"));
            vars.put("overdue", overdue);
            vars.put("due", due.format(DMY));
            vars.put("amount", money((BigDecimal) r.get("amount")) + "đ");
            vars.put("url", props.frontendUrl().replaceAll("/+$", "") + "/tai-khoan/tra-gop");
            mailService.sendQuietly((String) r.get("email"),
                    (overdue ? "Kỳ trả góp đã quá hạn" : "Sắp đến hạn trả góp") + " — ShopTech", "installment-reminder", vars);
            jdbc.update("UPDATE installment_payments SET reminded_at = :now WHERE id = :id",
                    new MapSqlParameterSource().addValue("now", Timestamp.from(Instant.now())).addValue("id", r.get("id")));
            sent++;
        }
        return sent;
    }

    // ------------------------------------------------------------------ helpers

    private Map<String, Object> pendingPlan(Long storeId, Long planId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM installment_plans WHERE id = :id AND store_id = :s FOR UPDATE",
                new MapSqlParameterSource().addValue("id", planId).addValue("s", storeId));
        if (rows.isEmpty()) {
            throw ApiException.notFound("Không tìm thấy yêu cầu trả góp");
        }
        if (!"pending_approval".equals(rows.get(0).get("status"))) {
            throw ApiException.unprocessable("Yêu cầu trả góp này đã được xử lý rồi.");
        }
        return rows.get(0);
    }

    private static LocalDate todayVn() {
        return LocalDate.now(CouponApplyService.VN);
    }

    private long count(String sql, MapSqlParameterSource params) {
        Long n = jdbc.queryForObject(sql, params, Long.class);
        return n == null ? 0 : n;
    }

    private static String money(BigDecimal v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", symbols).format(v);
    }
}
