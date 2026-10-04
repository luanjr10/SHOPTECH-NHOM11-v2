package com.shoptech.modules.dashboard.service;

import com.shoptech.modules.dashboard.dto.DashboardSummary;
import com.shoptech.modules.dashboard.dto.DashboardSummary.Activity;
import com.shoptech.modules.dashboard.dto.DashboardSummary.Kpi;
import com.shoptech.modules.dashboard.dto.DashboardSummary.Series;
import com.shoptech.modules.dashboard.dto.SellerDashboardSummary;
import com.shoptech.modules.store.entity.Store;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tổng quan một gian hàng cho seller — mọi số liệu lọc chặt theo store_id.
 * Doanh thu = seller_amount (tiền thực nhận sau hoa hồng), chỉ tính đơn đã hoàn tất.
 * Mốc thời gian theo UTC như DashboardService của admin.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SellerDashboardService {

    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MM-yyyy");

    /** "bảng ... WHERE điều kiện" cố định, có đúng một tham số store_id. */
    private static final String COMPLETED = "seller_orders so WHERE so.store_id = ? AND so.status = 'completed'";
    private static final String COMPLETED_WITH_ORDER = "seller_orders so JOIN orders o ON o.id = so.order_id "
            + "WHERE so.store_id = ? AND so.status = 'completed'";

    private static final String SUM_SELLER_AMOUNT = "COALESCE(SUM(so.seller_amount), 0)";

    private final JdbcTemplate jdbc;

    public SellerDashboardSummary summary(Store store) {
        long storeId = store.getId();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDate today = now.toLocalDate();
        LocalDateTime currentStart = today.minusDays(29).atStartOfDay();
        LocalDateTime currentEnd = today.atTime(LocalTime.MAX);
        LocalDateTime previousStart = today.minusDays(59).atStartOfDay();
        LocalDateTime previousEnd = today.minusDays(30).atTime(LocalTime.MAX);

        var kpis = new SellerDashboardSummary.Kpis(
                kpi(SUM_SELLER_AMOUNT, COMPLETED, false, storeId,
                        currentStart, currentEnd, previousStart, previousEnd),
                kpi("COUNT(*)", COMPLETED, true, storeId,
                        currentStart, currentEnd, previousStart, previousEnd),
                kpi("COUNT(DISTINCT o.user_id)", COMPLETED_WITH_ORDER, true, storeId,
                        currentStart, currentEnd, previousStart, previousEnd));

        return new SellerDashboardSummary(
                kpis,
                revenueByPaymentMethod(storeId, now),
                dailySeries(SUM_SELLER_AMOUNT, COMPLETED, storeId, currentStart, currentEnd),
                topCategories(storeId),
                topProducts(storeId),
                topCustomers(storeId),
                orderStatusByMonth(storeId, now),
                recentActivity(storeId),
                wallet(store.getSellerProfileId()));
    }

    // ------------------------------------------------------------------ KPI

    /** aggregate / from là hằng số trong class (không nhận input người dùng). */
    private Kpi kpi(String aggregate, String from, boolean countOnly, long storeId,
                    LocalDateTime curStart, LocalDateTime curEnd, LocalDateTime prevStart, LocalDateTime prevEnd) {
        String sql = "SELECT " + aggregate + " FROM " + from + " AND so.completed_at BETWEEN ? AND ?";
        double current = number(jdbc.queryForObject(sql, Number.class, storeId, ts(curStart), ts(curEnd)));
        double previous = number(jdbc.queryForObject(sql, Number.class, storeId, ts(prevStart), ts(prevEnd)));

        double change = previous > 0
                ? Math.round(((current - previous) / previous) * 100)
                : (current > 0 ? 100 : 0);

        Series series = dailySeries(aggregate, from, storeId, curStart, curEnd);
        Number cur = countOnly ? (Number) (long) current : current;
        Number prev = countOnly ? (Number) (long) previous : previous;
        return new Kpi(cur, prev, change, series.labels(), series.values());
    }

    private Series dailySeries(String aggregate, String from, long storeId, LocalDateTime start, LocalDateTime end) {
        String sql = "SELECT DATE(so.completed_at) AS d, " + aggregate + " AS v FROM " + from
                + " AND so.completed_at BETWEEN ? AND ? GROUP BY d";
        Map<String, Double> rows = new HashMap<>();
        jdbc.query(sql, rs -> {
            rows.put(rs.getString("d"), rs.getDouble("v"));
        }, storeId, ts(start), ts(end));

        List<String> labels = new ArrayList<>();
        List<Double> values = new ArrayList<>();
        for (LocalDate d = start.toLocalDate(); !d.isAfter(end.toLocalDate()); d = d.plusDays(1)) {
            String key = d.toString();
            labels.add(key);
            values.add(rows.getOrDefault(key, 0d));
        }
        return new Series(labels, values);
    }

    // ------------------------------------------------------------------ biểu đồ theo tháng

    private DashboardSummary.RevenueByPaymentMethod revenueByPaymentMethod(long storeId, LocalDateTime now) {
        YearMonth first = YearMonth.from(now).minusMonths(5);
        String sql = """
                SELECT DATE_FORMAT(so.completed_at, '%Y-%m') AS ym, o.payment_method AS method,
                       COALESCE(SUM(so.subtotal), 0) AS total
                FROM seller_orders so
                JOIN orders o ON o.id = so.order_id
                WHERE so.store_id = ? AND so.status = 'completed' AND so.completed_at >= ?
                GROUP BY ym, method
                """;
        Map<String, double[]> byMonth = new HashMap<>(); // [cod, online]
        jdbc.query(sql, rs -> {
            double[] t = byMonth.computeIfAbsent(rs.getString("ym"), k -> new double[2]);
            t["cod".equals(rs.getString("method")) ? 0 : 1] += rs.getDouble("total");
        }, storeId, ts(first.atDay(1).atStartOfDay()));

        List<String> labels = new ArrayList<>();
        List<Double> cod = new ArrayList<>();
        List<Double> online = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            YearMonth ym = first.plusMonths(i);
            double[] t = byMonth.getOrDefault(ym.toString(), new double[2]);
            labels.add(ym.format(MONTH_LABEL));
            cod.add(t[0]);
            online.add(t[1]);
        }
        return new DashboardSummary.RevenueByPaymentMethod(labels, cod, online);
    }

    private DashboardSummary.OrderStatusByMonth orderStatusByMonth(long storeId, LocalDateTime now) {
        YearMonth first = YearMonth.from(now).minusMonths(5);
        Timestamp start = ts(first.atDay(1).atStartOfDay());
        Map<String, Integer> completed = monthCounts(storeId, "completed", "completed_at", start);
        // Không có cột cancelled_at — dùng updated_at làm mốc gần đúng.
        Map<String, Integer> cancelled = monthCounts(storeId, "cancelled", "updated_at", start);

        List<String> labels = new ArrayList<>();
        List<Integer> c = new ArrayList<>();
        List<Integer> x = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            YearMonth ym = first.plusMonths(i);
            labels.add(ym.format(MONTH_LABEL));
            c.add(completed.getOrDefault(ym.toString(), 0));
            x.add(cancelled.getOrDefault(ym.toString(), 0));
        }
        return new DashboardSummary.OrderStatusByMonth(labels, c, x);
    }

    private Map<String, Integer> monthCounts(long storeId, String status, String dateColumn, Timestamp start) {
        String sql = "SELECT DATE_FORMAT(" + dateColumn + ", '%Y-%m') AS ym, COUNT(*) AS c FROM seller_orders "
                + "WHERE store_id = ? AND status = ? AND " + dateColumn + " >= ? GROUP BY ym";
        Map<String, Integer> out = new HashMap<>();
        jdbc.query(sql, rs -> {
            out.put(rs.getString("ym"), rs.getInt("c"));
        }, storeId, status, start);
        return out;
    }

    // ------------------------------------------------------------------ bảng xếp hạng

    private List<DashboardSummary.TopCategory> topCategories(long storeId) {
        String sql = """
                SELECT c.name AS name, COALESCE(SUM(oi.line_total), 0) AS revenue
                FROM order_items oi
                JOIN seller_orders so ON so.id = oi.seller_order_id AND so.status = 'completed' AND so.store_id = ?
                JOIN products p ON p.id = oi.product_id
                JOIN categories c ON c.id = p.category_id
                GROUP BY c.id, c.name
                ORDER BY revenue DESC
                """;
        List<DashboardSummary.TopCategory> rows = jdbc.query(sql,
                (rs, i) -> new DashboardSummary.TopCategory(rs.getString("name"), rs.getDouble("revenue")), storeId);
        List<DashboardSummary.TopCategory> result = new ArrayList<>(rows.subList(0, Math.min(5, rows.size())));
        double rest = rows.stream().skip(5).mapToDouble(DashboardSummary.TopCategory::revenue).sum();
        if (rest > 0) {
            result.add(new DashboardSummary.TopCategory("Khác", rest));
        }
        return result;
    }

    private List<SellerDashboardSummary.TopProduct> topProducts(long storeId) {
        String sql = """
                SELECT oi.product_id, oi.product_name,
                       COALESCE(SUM(oi.line_total), 0) AS revenue, COALESCE(SUM(oi.quantity), 0) AS quantity_sold
                FROM order_items oi
                JOIN seller_orders so ON so.id = oi.seller_order_id AND so.status = 'completed' AND so.store_id = ?
                GROUP BY oi.product_id, oi.product_name
                ORDER BY revenue DESC
                LIMIT 5
                """;
        return jdbc.query(sql, (rs, i) -> new SellerDashboardSummary.TopProduct(
                rs.getObject("product_id", Integer.class), rs.getString("product_name"),
                rs.getDouble("revenue"), rs.getInt("quantity_sold")), storeId);
    }

    private List<DashboardSummary.TopCustomer> topCustomers(long storeId) {
        String sql = """
                SELECT u.id, u.name, u.avatar, u.google_avatar,
                       COALESCE(SUM(so.subtotal), 0) AS total_spent, COUNT(*) AS orders_count
                FROM seller_orders so
                JOIN orders o ON o.id = so.order_id
                JOIN users u ON u.id = o.user_id
                WHERE so.store_id = ? AND so.status = 'completed'
                GROUP BY u.id, u.name, u.avatar, u.google_avatar
                ORDER BY total_spent DESC
                LIMIT 5
                """;
        return jdbc.query(sql, (rs, i) -> {
            String avatar = rs.getString("avatar");
            return new DashboardSummary.TopCustomer(rs.getLong("id"), rs.getString("name"),
                    avatar != null ? avatar : rs.getString("google_avatar"),
                    rs.getDouble("total_spent"), rs.getInt("orders_count"));
        }, storeId);
    }

    // ------------------------------------------------------------------ hoạt động gần đây

    /** Trộn 3 nguồn: đơn hoàn tất, người theo dõi mới, đánh giá sản phẩm của gian hàng. */
    private List<Activity> recentActivity(long storeId) {
        List<Activity> items = new ArrayList<>();

        items.addAll(jdbc.query("""
                SELECT COALESCE(u.name, '') AS user_name, so.seller_amount, so.completed_at
                FROM seller_orders so
                LEFT JOIN orders o ON o.id = so.order_id
                LEFT JOIN users u ON u.id = o.user_id
                WHERE so.store_id = ? AND so.status = 'completed'
                ORDER BY so.completed_at DESC
                LIMIT 5
                """, (rs, i) -> new Activity("order_completed",
                rs.getString("user_name") + " vừa hoàn tất đơn hàng",
                rs.getDouble("seller_amount"), instant(rs.getTimestamp("completed_at"))), storeId));

        items.addAll(jdbc.query("""
                SELECT COALESCE(u.name, '') AS user_name, f.created_at
                FROM store_follows f
                LEFT JOIN users u ON u.id = f.user_id
                WHERE f.store_id = ?
                ORDER BY f.created_at DESC
                LIMIT 3
                """, (rs, i) -> new Activity("new_follower",
                rs.getString("user_name") + " vừa theo dõi gian hàng",
                null, instant(rs.getTimestamp("created_at"))), storeId));

        items.addAll(jdbc.query("""
                SELECT COALESCE(u.name, '') AS user_name, p.name AS product_name, r.rating, r.created_at
                FROM product_reviews r
                JOIN products p ON p.id = r.product_id
                LEFT JOIN users u ON u.id = r.user_id
                WHERE p.store_id = ?
                ORDER BY r.created_at DESC
                LIMIT 3
                """, (rs, i) -> new Activity("review",
                rs.getString("user_name") + " đánh giá " + rs.getInt("rating") + "★ cho " + rs.getString("product_name"),
                null, instant(rs.getTimestamp("created_at"))), storeId));

        return items.stream()
                .sorted(Comparator.comparing(Activity::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(8)
                .toList();
    }

    private SellerDashboardSummary.Wallet wallet(Long sellerProfileId) {
        List<SellerDashboardSummary.Wallet> rows = jdbc.query("""
                SELECT balance, pending_balance, withdrawable_balance
                FROM seller_wallets WHERE seller_profile_id = ? LIMIT 1
                """, (rs, i) -> new SellerDashboardSummary.Wallet(
                rs.getDouble("balance"), rs.getDouble("pending_balance"), rs.getDouble("withdrawable_balance")),
                sellerProfileId);
        return rows.isEmpty() ? new SellerDashboardSummary.Wallet(0, 0, 0) : rows.get(0);
    }

    // ------------------------------------------------------------------ util

    private static Timestamp ts(LocalDateTime t) {
        return Timestamp.valueOf(t);
    }

    private static java.time.Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }

    private static double number(Number n) {
        return n == null ? 0 : n.doubleValue();
    }
}
