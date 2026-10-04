import { Clock, Wallet as WalletIcon, WalletCards } from "lucide-react";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { SellerWalletSummary } from "../../types/dashboard.types";

interface Props {
  data: SellerWalletSummary;
}

export default function WalletSummaryCard({ data }: Props) {
  const rows = [
    { icon: WalletIcon, label: "Tổng số dư", value: data.balance, color: "bg-violet-500" },
    { icon: Clock, label: "Đang giữ (đơn chưa hoàn tất)", value: data.pending_balance, color: "bg-amber-500" },
    { icon: WalletCards, label: "Có thể rút", value: data.withdrawable_balance, color: "bg-emerald-500" },
  ];

  return (
    <div className="col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Ví của tôi</h2>
      </header>
      <div className="p-3">
        <ul className="my-1">
          {rows.map((row) => (
            <li key={row.label} className="flex px-2">
              <div className={`w-9 h-9 rounded-full shrink-0 my-2 mr-3 flex items-center justify-center ${row.color}`}>
                <row.icon className="size-4 text-white" />
              </div>
              <div className="grow flex items-center border-b border-gray-100 dark:border-gray-700/60 text-sm py-2 last:border-0">
                <div className="grow flex justify-between">
                  <div className="self-center text-gray-700 dark:text-gray-200">{row.label}</div>
                  <div className="shrink-0 self-end ml-2 font-semibold text-gray-800 dark:text-gray-100">
                    {formatMoneyVietNam(row.value)}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
