package com.shoptech.modules.dashboard.service;

import com.shoptech.modules.dashboard.dto.SellerRevenueSummary;
import com.shoptech.modules.store.entity.Store;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

/** Seller Center — báo cáo doanh thu theo khoảng ngày (mặc định 30). Thời gian theo UTC. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SellerRevenueService {

    public static final int DEFAULT_DAYS = 30;
    private static final int MAX_DAYS = 365;

    private final JdbcTemplate jdbc;

    public SellerRevenueSummary summary(Store store, Integer requestedDays) {
        int days = requestedDays == null ? DEFAULT_DAYS : Math.max(1, Math.min(requestedDays, MAX_DAYS));
        Timestamp since = Timestamp.valueOf(LocalDate.now(ZoneOffset.UTC).minusDays(days - 1L).atStartOfDay());

        SellerRevenueSummary totals = jdbc.queryForObject("""
                SELECT COUNT(*) AS orders_count,
                       COALESCE(SUM(subtotal), 0) AS gross_revenue,
                       COALESCE(SUM(commission_amount), 0) AS commission_paid,
                       COALESCE(SUM(seller_amount), 0) AS net_revenue
                FROM seller_orders
                WHERE store_id = ? AND status = 'completed' AND completed_at >= ?
                """, (rs, i) -> new SellerRevenueSummary(days, rs.getLong("orders_count"),
                rs.getDouble("gross_revenue"), rs.getDouble("commission_paid"), rs.getDouble("net_revenue"),
                List.of()), store.getId(), since);

        List<SellerRevenueSummary.Point> series = jdbc.query("""
                SELECT DATE(completed_at) AS d, COALESCE(SUM(seller_amount), 0) AS revenue, COUNT(*) AS orders_count
                FROM seller_orders
                WHERE store_id = ? AND status = 'completed' AND completed_at >= ?
                GROUP BY d
                ORDER BY d
                """, (rs, i) -> new SellerRevenueSummary.Point(rs.getString("d"), rs.getDouble("revenue"),
                rs.getLong("orders_count")), store.getId(), since);

        return new SellerRevenueSummary(days, totals.ordersCount(), totals.grossRevenue(),
                totals.commissionPaid(), totals.netRevenue(), series);
    }
}
