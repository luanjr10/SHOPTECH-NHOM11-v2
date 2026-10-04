import { TrendingDown, TrendingUp } from "lucide-react";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { PlatformFunds } from "../../types/dashboard.types";

interface Props {
  data: PlatformFunds;
}

function ChangeRow({ label, current, previous }: { label: string; current: number; previous: number }) {
  const changePercent = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  const isUp = changePercent >= 0;

  return (
    <li className="flex px-2">
      <div
        className={`w-9 h-9 rounded-full shrink-0 my-2 mr-3 flex items-center justify-center ${
          isUp ? "bg-emerald-500" : "bg-rose-500"
        }`}
      >
        {isUp ? <TrendingUp className="size-4 text-white" /> : <TrendingDown className="size-4 text-white" />}
      </div>
      <div className="grow flex items-center border-b border-gray-100 dark:border-gray-700/60 text-sm py-2 last:border-0">
        <div className="grow flex justify-between">
          <div className="self-center text-gray-700 dark:text-gray-200">{label}</div>
          <div className="shrink-0 self-end ml-2 text-right">
            <div className="font-semibold text-gray-800 dark:text-gray-100">{formatMoneyVietNam(current)}</div>
            <div className={`text-xs ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
              {isUp ? "+" : ""}
              {changePercent}% so với tháng trước
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function PlatformFundsCard({ data }: Props) {
  return (
    <div className="col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Doanh thu sàn & Hoa hồng</h2>
      </header>
      <div className="p-3">
        <ul className="my-1">
          <ChangeRow
            label="Tổng giá trị giao dịch (GMV) tháng này"
            current={data.gmv_this_month}
            previous={data.gmv_last_month}
          />
          <ChangeRow
            label="Hoa hồng ShopTech nhận tháng này"
            current={data.commission_this_month}
            previous={data.commission_last_month}
          />
        </ul>
      </div>
    </div>
  );
}
