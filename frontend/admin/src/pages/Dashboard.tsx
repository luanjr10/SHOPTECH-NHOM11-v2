import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import KpiCard from "../partials/dashboard/KpiCard";
import PaymentMethodChart from "../partials/dashboard/PaymentMethodChart";
import DailyRevenueChart from "../partials/dashboard/DailyRevenueChart";
import TopCategoriesChart from "../partials/dashboard/TopCategoriesChart";
import TopStoresTable from "../partials/dashboard/TopStoresTable";
import TopCustomersTable from "../partials/dashboard/TopCustomersTable";
import OrderStatusChart from "../partials/dashboard/OrderStatusChart";
import RecentActivityCard from "../partials/dashboard/RecentActivityCard";
import PlatformFundsCard from "../partials/dashboard/PlatformFundsCard";
import { getDashboardSummary } from "../services/dashboard.services";
import { formatMoneyVietNam } from "../helpers/formatMoney";
import { DashboardSummary } from "../types/dashboard.types";

function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then(setData)
      .catch((error) => console.error("Không tải được dữ liệu Dashboard:", error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
      <main className="grow">
        <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
          <div className="sm:flex sm:justify-between sm:items-center mb-8">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng quan toàn sàn ShopTech</p>
            </div>
          </div>

          {loading || !data ? (
            <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
              <Loader2 className="size-6 animate-spin" />
              <span>Đang tải dữ liệu...</span>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              <KpiCard
                title="Doanh thu (hoa hồng)"
                subtitle="30 ngày gần nhất"
                value={formatMoneyVietNam(data.kpis.revenue.current)}
                changePercent={data.kpis.revenue.change_percent}
                labels={data.kpis.revenue.labels}
                series={data.kpis.revenue.series}
              />
              <KpiCard
                title="Đơn hàng hoàn tất"
                subtitle="30 ngày gần nhất"
                value={String(data.kpis.orders.current)}
                changePercent={data.kpis.orders.change_percent}
                labels={data.kpis.orders.labels}
                series={data.kpis.orders.series}
                unit="count"
              />
              <KpiCard
                title="Người dùng mới"
                subtitle="30 ngày gần nhất"
                value={String(data.kpis.new_users.current)}
                changePercent={data.kpis.new_users.change_percent}
                labels={data.kpis.new_users.labels}
                series={data.kpis.new_users.series}
                unit="count"
              />

              <PaymentMethodChart data={data.revenue_by_payment_method} />
              <DailyRevenueChart data={data.daily_revenue} />

              <TopCategoriesChart data={data.top_categories} />
              <TopStoresTable data={data.top_stores} />

              <OrderStatusChart data={data.order_status_by_month} />
              <TopCustomersTable data={data.top_customers} />

              <RecentActivityCard data={data.recent_activity} />
              <PlatformFundsCard data={data.platform_funds} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
