package com.shoptech.modules.dashboard.dto;

import java.time.Instant;
import java.util.List;

/** Khớp interface DashboardSummary trong frontend/admin/src/types/dashboard.types.tsx. */
public record DashboardSummary(
        Kpis kpis,
        RevenueByPaymentMethod revenueByPaymentMethod,
        Series dailyRevenue,
        List<TopCategory> topCategories,
        List<TopStore> topStores,
        List<TopCustomer> topCustomers,
        OrderStatusByMonth orderStatusByMonth,
        List<Activity> recentActivity,
        PlatformFunds platformFunds
) {

    public record Kpis(Kpi revenue, Kpi orders, Kpi newUsers) {
    }

    public record Kpi(Number current, Number previous, Number changePercent, List<String> labels, List<Double> series) {
    }

    public record Series(List<String> labels, List<Double> values) {
    }

    public record RevenueByPaymentMethod(List<String> labels, List<Double> cod, List<Double> online) {
    }

    public record TopCategory(String name, double revenue) {
    }

    public record TopStore(Long id, String name, String logo, double revenue, int ordersCount) {
    }

    public record TopCustomer(Long id, String name, String avatarUrl, double totalSpent, int ordersCount) {
    }

    public record OrderStatusByMonth(List<String> labels, List<Integer> completed, List<Integer> cancelled) {
    }

    public record Activity(String type, String title, Double amount, Instant createdAt) {
    }

    public record PlatformFunds(double gmvThisMonth, double commissionThisMonth, double gmvLastMonth,
                                double commissionLastMonth) {
    }
}
