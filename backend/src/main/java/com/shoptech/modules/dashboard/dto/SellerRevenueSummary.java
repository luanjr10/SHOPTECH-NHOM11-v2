package com.shoptech.modules.dashboard.dto;

import java.util.List;

/**
 * Doanh thu gian hàng trong N ngày gần nhất (chỉ đơn đã hoàn tất):
 * doanh thu gộp (subtotal) − hoa hồng sàn = thực nhận (seller_amount).
 */
public record SellerRevenueSummary(
        int days,
        long ordersCount,
        double grossRevenue,
        double commissionPaid,
        double netRevenue,
        List<Point> series
) {

    /** Chỉ có những ngày phát sinh đơn (frontend tự lấp ngày trống khi vẽ biểu đồ). */
    public record Point(String date, double revenue, long ordersCount) {
    }
}
