package com.shoptech.modules.dashboard.dto;

import com.shoptech.modules.dashboard.dto.DashboardSummary.Activity;
import com.shoptech.modules.dashboard.dto.DashboardSummary.Kpi;
import com.shoptech.modules.dashboard.dto.DashboardSummary.OrderStatusByMonth;
import com.shoptech.modules.dashboard.dto.DashboardSummary.RevenueByPaymentMethod;
import com.shoptech.modules.dashboard.dto.DashboardSummary.Series;
import com.shoptech.modules.dashboard.dto.DashboardSummary.TopCategory;
import com.shoptech.modules.dashboard.dto.DashboardSummary.TopCustomer;

import java.util.List;

/**
 * Tổng quan một gian hàng (Seller Center) — khớp SellerDashboardSummary trong
 * frontend/admin/src/types/dashboard.types.tsx. Cùng khuôn với DashboardSummary của admin
 * nhưng thay "top gian hàng" bằng "top sản phẩm" và "quỹ sàn" bằng "ví của tôi".
 */
public record SellerDashboardSummary(
        Kpis kpis,
        RevenueByPaymentMethod revenueByPaymentMethod,
        Series dailyRevenue,
        List<TopCategory> topCategories,
        List<TopProduct> topProducts,
        List<TopCustomer> topCustomers,
        OrderStatusByMonth orderStatusByMonth,
        List<Activity> recentActivity,
        Wallet wallet
) {

    public record Kpis(Kpi revenue, Kpi orders, Kpi customers) {
    }

    public record TopProduct(Integer productId, String name, double revenue, int quantitySold) {
    }

    public record Wallet(double balance, double pendingBalance, double withdrawableBalance) {
    }
}
