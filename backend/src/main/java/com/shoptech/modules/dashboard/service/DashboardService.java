package com.shoptech.modules.dashboard.service;

import com.shoptech.modules.dashboard.dto.DashboardSummary;
import com.shoptech.modules.dashboard.dto.DashboardSummary.Activity;
import com.shoptech.modules.dashboard.dto.DashboardSummary.Kpi;
import com.shoptech.modules.dashboard.dto.DashboardSummary.Series;
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
 * Tổng quan sàn cho admin: KPI 30 ngày, biểu đồ theo tháng, bảng xếp hạng, hoạt động gần đây.
 * Dùng SQL gộp nhóm trực tiếp vì là truy vấn báo cáo (không cần entity cho seller_orders/orders...).
 * Mọi mốc thời gian tính theo UTC (múi giờ lưu trong database).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MM-yyyy");

    /** Nguồn dữ liệu cho KPI/chuỗi ngày: bảng + điều kiện cố định (không nhận input người dùng). */
    private record Source(String table, String where) {
    }

    private static final Source COMPLETED_SELLER_ORDERS = new Source("seller_orders", "status = 'completed'");
    private static final Source USERS = new Source("users", "1 = 1");

    private final JdbcTemplate jdbc;

    public DashboardSummary summary() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDate today = now.toLocalDate();
        LocalDateTime currentStart = today.minusDays(29).atStartOfDay();
        LocalDateTime currentEnd = today.atTime(LocalTime.MAX);
        LocalDateTime previousStart = today.minusDays(59).atStartOfDay();
        LocalDateTime previousEnd = today.minusDays(30).atTime(LocalTime.MAX);

        var kpis = new DashboardSummary.Kpis(
                kpi(COMPLETED_SELLER_ORDERS, "completed_at", "commission_amount", false,
                        currentStart, currentEnd, previousStart, previousEnd),
                kpi(COMPLETED_SELLER_ORDERS, "completed_at", "1", true,
                        currentStart, currentEnd, previousStart, previousEnd),
                kpi(USERS, "created_at", "1", true,
                        currentStart, currentEnd, previousStart, previousEnd));

        return new DashboardSummary(
                kpis,
                revenueByPaymentMethod(now),
                dailySeries(COMPLETED_SELLER_ORDERS, "completed_at", "commission_amount", currentStart, currentEnd),
                topCategories(),
                topStores(),
                topCustomers(),
                orderStatusByMonth(now),
                recentActivity(),
                platformFunds(now));
    }

    // ------------------------------------------------------------------ KPI

    private Kpi kpi(Source src, String dateColumn, String sumExpr, boolean countOnly,
                    LocalDateTime curStart, LocalDateTime curEnd, LocalDateTime prevStart, LocalDateTime prevEnd) {
        String agg = countOnly ? "COUNT(*)" : "COALESCE(SUM(" + sumExpr + "), 0)";
        String sql = "SELECT " + agg + " FROM " + src.table() + " WHERE " + src.where()
                + " AND " + dateColumn + " BETWEEN ? AND ?";
        double current = number(jdbc.queryForObject(sql, Number.class, ts(curStart), ts(curEnd)));
        double previous = number(jdbc.queryForObject(sql, Number.class, ts(prevStart), ts(prevEnd)));

        double change = previous > 0
                ? Math.round(((current - previous) / previous) * 100)
                : (current > 0 ? 100 : 0);

        Series series = dailySeries(src, dateColumn, sumExpr, curStart, curEnd);
        Number cur = countOnly ? (Number) (long) current : current;
        Number prev = countOnly ? (Number) (long) previous : previous;
        return new Kpi(cur, prev, change, series.labels(), series.values());
    }

    private Series dailySeries(Source src, String dateColumn, String sumExpr, LocalDateTime start, LocalDateTime end) {
        String sql = "SELECT DATE(" + dateColumn + ") AS d, COALESCE(SUM(" + sumExpr + "), 0) AS v FROM " + src.table()
                + " WHERE " + src.where() + " AND " + dateColumn + " BETWEEN ? AND ? GROUP BY d";
        Map<String, Double> rows = new HashMap<>();
        jdbc.query(sql, rs -> {
            rows.put(rs.getString("d"), rs.getDouble("v"));
        }, ts(start), ts(end));

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

    private DashboardSummary.RevenueByPaymentMethod revenueByPaymentMethod(LocalDateTime now) {
        YearMonth first = YearMonth.from(now).minusMonths(5);
        String sql = """
                SELECT DATE_FORMAT(so.completed_at, '%Y-%m') AS ym, o.payment_method AS method,
                       COALESCE(SUM(so.subtotal), 0) AS total
                FROM seller_orders so
                JOIN orders o ON o.id = so.order_id
                WHERE so.status = 'completed' AND so.completed_at >= ?
                GROUP BY ym, method
                """;
        Map<String, double[]> byMonth = new HashMap<>(); // [cod, online]
        jdbc.query(sql, rs -> {
            double[] t = byMonth.computeIfAbsent(rs.getString("ym"), k -> new double[2]);
            t["cod".equals(rs.getString("method")) ? 0 : 1] += rs.getDouble("total");
        }, ts(first.atDay(1).atStartOfDay()));

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

    private DashboardSummary.OrderStatusByMonth orderStatusByMonth(LocalDateTime now) {
        YearMonth first = YearMonth.from(now).minusMonths(5);
        Timestamp start = ts(first.atDay(1).atStartOfDay());
        Map<String, Integer> completed = monthCounts("completed", "completed_at", start);
        Map<String, Integer> cancelled = monthCounts("cancelled", "updated_at", start);

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

    private Map<String, Integer> monthCounts(String status, String dateColumn, Timestamp start) {
        String sql = "SELECT DATE_FORMAT(" + dateColumn + ", '%Y-%m') AS ym, COUNT(*) AS c FROM seller_orders "
                + "WHERE status = ? AND " + dateColumn + " >= ? GROUP BY ym";
        Map<String, Integer> out = new HashMap<>();
        jdbc.query(sql, rs -> {
            out.put(rs.getString("ym"), rs.getInt("c"));
        }, status, start);
        return out;
    }

    // ------------------------------------------------------------------ bảng xếp hạng

    private List<DashboardSummary.TopCategory> topCategories() {
        String sql = """
                SELECT c.name AS name, COALESCE(SUM(oi.line_total), 0) AS revenue
                FROM order_items oi
                JOIN seller_orders so ON so.id = oi.seller_order_id AND so.status = 'completed'
                JOIN products p ON p.id = oi.product_id
                JOIN categories c ON c.id = p.category_id
                GROUP BY c.id, c.name
                ORDER BY revenue DESC
                """;
        List<DashboardSummary.TopCategory> rows = jdbc.query(sql,
                (rs, i) -> new DashboardSummary.TopCategory(rs.getString("name"), rs.getDouble("revenue")));
        List<DashboardSummary.TopCategory> result = new ArrayList<>(rows.subList(0, Math.min(5, rows.size())));
        double rest = rows.stream().skip(5).mapToDouble(DashboardSummary.TopCategory::revenue).sum();
        if (rest > 0) {
            result.add(new DashboardSummary.TopCategory("Khác", rest));
        }
        return result;
    }

    private List<DashboardSummary.TopStore> topStores() {
        String sql = """
                SELECT s.id, s.name, s.logo, COALESCE(SUM(so.seller_amount), 0) AS revenue, COUNT(*) AS orders_count
                FROM seller_orders so
                JOIN stores s ON s.id = so.store_id
                WHERE so.status = 'completed'
                GROUP BY s.id, s.name, s.logo
                ORDER BY revenue DESC
                LIMIT 5
                """;
        return jdbc.query(sql, (rs, i) -> new DashboardSummary.TopStore(
                rs.getLong("id"), rs.getString("name"), rs.getString("logo"),
                rs.getDouble("revenue"), rs.getInt("orders_count")));
    }

    private List<DashboardSummary.TopCustomer> topCustomers() {
        String sql = """
                SELECT u.id, u.name, u.avatar, u.google_avatar,
                       COALESCE(SUM(o.total_amount), 0) AS total_spent, COUNT(*) AS orders_count
                FROM orders o
                JOIN users u ON u.id = o.user_id
                WHERE o.status = 'completed'
                GROUP BY u.id, u.name, u.avatar, u.google_avatar
                ORDER BY total_spent DESC
                LIMIT 5
                """;
        return jdbc.query(sql, (rs, i) -> {
            String avatar = rs.getString("avatar");
            return new DashboardSummary.TopCustomer(rs.getLong("id"), rs.getString("name"),
                    avatar != null ? avatar : rs.getString("google_avatar"),
                    rs.getDouble("total_spent"), rs.getInt("orders_count"));
        });
    }

    // ------------------------------------------------------------------ hoạt động gần đây

    private List<Activity> recentActivity() {
        List<Activity> items = new ArrayList<>();

        items.addAll(jdbc.query("""
                SELECT COALESCE(u.name, '') AS user_name, COALESCE(s.name, '') AS store_name,
                       so.seller_amount, so.completed_at
                FROM seller_orders so
                LEFT JOIN stores s ON s.id = so.store_id
                LEFT JOIN orders o ON o.id = so.order_id
                LEFT JOIN users u ON u.id = o.user_id
                WHERE so.status = 'completed'
                ORDER BY so.completed_at DESC
                LIMIT 5
                """, (rs, i) -> new Activity("order_completed",
                rs.getString("user_name") + " vừa hoàn tất đơn tại " + rs.getString("store_name"),
                rs.getDouble("seller_amount"), instant(rs.getTimestamp("completed_at")))));

        items.addAll(jdbc.query("""
                SELECT COALESCE(u.name, '') AS user_name, sp.created_at
                FROM seller_profiles sp
                LEFT JOIN users u ON u.id = sp.user_id
                WHERE sp.status = 'active'
                ORDER BY sp.created_at DESC
                LIMIT 3
                """, (rs, i) -> new Activity("seller_joined",
                rs.getString("user_name") + " vừa trở thành người bán",
                null, instant(rs.getTimestamp("created_at")))));

        items.addAll(jdbc.query("""
                SELECT COALESCE(u.name, '') AS user_name, COALESCE(p.name, '') AS product_name, r.rating, r.created_at
                FROM product_reviews r
                LEFT JOIN users u ON u.id = r.user_id
                LEFT JOIN products p ON p.id = r.product_id
                ORDER BY r.created_at DESC
                LIMIT 3
                """, (rs, i) -> new Activity("review",
                rs.getString("user_name") + " đánh giá " + rs.getInt("rating") + "★ cho " + rs.getString("product_name"),
                null, instant(rs.getTimestamp("created_at")))));

        return items.stream()
                .sorted(Comparator.comparing(Activity::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(8)
                .toList();
    }

    private DashboardSummary.PlatformFunds platformFunds(LocalDateTime now) {
        LocalDateTime thisMonthStart = YearMonth.from(now).atDay(1).atStartOfDay();
        LocalDateTime lastMonthStart = YearMonth.from(now).minusMonths(1).atDay(1).atStartOfDay();
        LocalDateTime lastMonthEnd = thisMonthStart.minusSeconds(1);

        double[] thisMonth = gmvAndCommission("completed_at >= ?", ts(thisMonthStart));
        double[] lastMonth = gmvAndCommission("completed_at BETWEEN ? AND ?", ts(lastMonthStart), ts(lastMonthEnd));
        return new DashboardSummary.PlatformFunds(thisMonth[0], thisMonth[1], lastMonth[0], lastMonth[1]);
    }

    private double[] gmvAndCommission(String dateCondition, Object... args) {
        String sql = "SELECT COALESCE(SUM(subtotal), 0) AS gmv, COALESCE(SUM(commission_amount), 0) AS commission "
                + "FROM seller_orders WHERE status = 'completed' AND " + dateCondition;
        return jdbc.queryForObject(sql, (rs, i) -> new double[]{rs.getDouble("gmv"), rs.getDouble("commission")}, args);
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
