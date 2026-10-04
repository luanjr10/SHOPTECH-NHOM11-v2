import { useEffect, useState } from "react";
import { Loader2, Package, Percent, Receipt, Wallet } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getStoreRevenue } from "../../services/seller.services";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { RevenueSummary } from "../../types/seller.types";
import DailyRevenueChart from "../../partials/dashboard/DailyRevenueChart";

const DAY_OPTIONS = [7, 30, 90];

/** Backend chỉ trả những ngày có đơn — lấp 0 cho các ngày còn lại để biểu đồ liền mạch (ngày theo UTC). */
function fillDailySeries(summary: RevenueSummary | null, days: number) {
  const byDate = new Map((summary?.series ?? []).map((s) => [s.date, Number(s.revenue)]));
  const labels: string[] = [];
  const values: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    labels.push(key);
    values.push(byDate.get(key) ?? 0);
  }
  return { labels, values };
}

interface StatCardProps {
  icon: typeof Wallet;
  iconColor: string;
  label: string;
  value: string;
  highlight?: boolean;
}

function StatCard({ icon: Icon, iconColor, label, value, highlight }: StatCardProps) {
  return (
    <div
      className={`flex flex-col col-span-full sm:col-span-6 xl:col-span-3 rounded-xl bg-white shadow-xs dark:bg-gray-800 ${
        highlight ? "ring-1 ring-violet-500/30" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-5">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconColor}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
          <div className="truncate text-xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function SellerRevenue() {
  const { activeStore } = useAuth();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeStore) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getStoreRevenue(activeStore.id, days)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [activeStore, days]);

  if (!activeStore) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Doanh thu</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Bạn chưa có gian hàng nào.
        </div>
      </div>
    );
  }

  const chartData = fillDailySeries(summary, days);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Doanh thu</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gian hàng đang chọn: {activeStore.name}
          </p>
        </div>
        <div className="flex gap-2 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                days === d
                  ? "bg-violet-600 text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
          <Loader2 className="size-6 animate-spin" />
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <StatCard
            icon={Package}
            iconColor="bg-blue-500/15 text-blue-500"
            label="Số đơn hoàn tất"
            value={String(summary?.orders_count ?? 0)}
          />
          <StatCard
            icon={Receipt}
            iconColor="bg-slate-500/15 text-slate-500"
            label="Tổng giá trị đơn"
            value={formatMoneyVietNam(summary?.gross_revenue ?? 0)}
          />
          <StatCard
            icon={Percent}
            iconColor="bg-amber-500/15 text-amber-500"
            label="Hoa hồng sàn"
            value={formatMoneyVietNam(summary?.commission_paid ?? 0)}
          />
          <StatCard
            icon={Wallet}
            iconColor="bg-violet-500/15 text-violet-500"
            label="Doanh thu thực nhận"
            value={formatMoneyVietNam(summary?.net_revenue ?? 0)}
            highlight
          />

          {!summary || summary.series.length === 0 ? (
            <div className="col-span-full rounded-xl bg-white p-10 text-center text-sm text-gray-400 shadow-xs dark:bg-gray-800">
              Chưa có đơn hoàn tất trong khoảng thời gian này.
            </div>
          ) : (
            <div className="col-span-full">
              <DailyRevenueChart
                data={chartData}
                title={`Doanh thu theo ngày (${days} ngày gần nhất)`}
                subtitle="Doanh thu thực nhận sau khi trừ hoa hồng sàn"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
