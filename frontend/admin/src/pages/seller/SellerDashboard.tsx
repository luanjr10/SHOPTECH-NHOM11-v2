import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getSellerDashboardSummary } from "../../services/dashboard.services";
import { SellerDashboardSummary } from "../../types/dashboard.types";
import KpiCard from "../../partials/dashboard/KpiCard";
import PaymentMethodChart from "../../partials/dashboard/PaymentMethodChart";
import DailyRevenueChart from "../../partials/dashboard/DailyRevenueChart";
import TopCategoriesChart from "../../partials/dashboard/TopCategoriesChart";
import TopProductsTable from "../../partials/dashboard/TopProductsTable";
import TopCustomersTable from "../../partials/dashboard/TopCustomersTable";
import OrderStatusChart from "../../partials/dashboard/OrderStatusChart";
import RecentActivityCard from "../../partials/dashboard/RecentActivityCard";
import WalletSummaryCard from "../../partials/dashboard/WalletSummaryCard";
import { formatMoneyVietNam } from "../../helpers/formatMoney";

export default function SellerDashboard() {
  const { activeStore } = useAuth();
  const [data, setData] = useState<SellerDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeStore) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSellerDashboardSummary(activeStore.id)
      .then(setData)
      .catch((error) => console.error("Không tải được dữ liệu Dashboard:", error))
      .finally(() => setLoading(false));
  }, [activeStore]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tổng quan gian hàng</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gian hàng đang chọn: {activeStore?.name ?? "Chưa chọn"}
        </p>
      </div>

      {!activeStore ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Bạn chưa có gian hàng nào. Vào mục{" "}
          <span className="font-medium text-gray-800 dark:text-white">Gian hàng</span> để tạo gian
          hàng đầu tiên.
        </div>
      ) : loading || !data ? (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
          <Loader2 className="size-6 animate-spin" />
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <KpiCard
            title="Doanh thu (thực nhận)"
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
            title="Khách hàng"
            subtitle="30 ngày gần nhất"
            value={String(data.kpis.customers.current)}
            changePercent={data.kpis.customers.change_percent}
            labels={data.kpis.customers.labels}
            series={data.kpis.customers.series}
            unit="count"
          />

          <PaymentMethodChart data={data.revenue_by_payment_method} />
          <DailyRevenueChart
            data={data.daily_revenue}
            title="Doanh thu theo ngày (30 ngày)"
            subtitle="Tổng doanh thu thực nhận trong 30 ngày"
          />

          <TopCategoriesChart data={data.top_categories} />
          <TopProductsTable data={data.top_products} />

          <OrderStatusChart data={data.order_status_by_month} />
          <TopCustomersTable data={data.top_customers} />

          <RecentActivityCard data={data.recent_activity} />
          <WalletSummaryCard data={data.wallet} />
        </div>
      )}
    </div>
  );
}
