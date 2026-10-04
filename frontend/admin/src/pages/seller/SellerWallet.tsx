import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { getWallet, getWalletTransactions } from "../../services/seller.services";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { formatDate } from "../../helpers/formatDate";
import DataTable, { Column } from "../../components/common/DataTable";
import { WalletInfo, WalletTransaction } from "../../types/seller.types";

/** Loại biến động ví (wallet_transactions.type) → nhãn + màu. */
const TX_META: Record<string, { label: string; className: string }> = {
  hold: { label: "Giữ tiền", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  release: { label: "Được rút", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  refund: { label: "Hoàn lại", className: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  debit: { label: "Đã rút", className: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
};

export default function SellerWallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    getWallet().then(setWallet);
  }, []);

  useEffect(() => {
    getWalletTransactions(page).then((res) => {
      setTransactions(res.data ?? []);
      setLastPage(res.last_page ?? 1);
      setTotal(res.total ?? 0);
    });
  }, [page]);

  const columns: Column<WalletTransaction>[] = [
    {
      header: "Loại",
      render: (t) => {
        const meta = TX_META[t.type] ?? { label: t.type, className: "border-gray-500/20 text-gray-400" };
        return (
          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
            {meta.label}
          </span>
        );
      },
    },
    {
      header: "Số tiền",
      render: (t) => (
        <span className={`font-semibold ${t.type === "debit" ? "text-rose-500" : "text-gray-800 dark:text-gray-100"}`}>
          {t.type === "debit" ? "−" : ""}
          {formatMoneyVietNam(Number(t.amount))}
        </span>
      ),
    },
    {
      header: "Số dư sau",
      render: (t) => <span className="text-gray-500 dark:text-gray-400">{formatMoneyVietNam(Number(t.balance_after))}</span>,
    },
    { header: "Nội dung", render: (t) => t.description ?? "—" },
    { header: "Thời gian", render: (t) => formatDate(t.created_at) },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ví người bán</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ví chung cho mọi gian hàng của bạn. Tiền đơn hàng được giữ đến khi đơn hoàn tất rồi mới chuyển sang "Có thể rút".
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-xs text-gray-500 dark:text-gray-400">Tổng số dư</div>
          <div className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
            {formatMoneyVietNam(Number(wallet?.balance ?? 0))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-xs text-gray-500 dark:text-gray-400">Đang giữ (đơn chưa hoàn tất)</div>
          <div className="mt-1 text-xl font-semibold text-amber-500">
            {formatMoneyVietNam(Number(wallet?.pending_balance ?? 0))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-xs text-gray-500 dark:text-gray-400">Có thể rút</div>
          <div className="mt-1 text-xl font-semibold text-emerald-500">
            {formatMoneyVietNam(Number(wallet?.withdrawable_balance ?? 0))}
          </div>
        </div>
      </div>

      <DataTable
        title="Lịch sử giao dịch"
        data={transactions}
        columns={columns}
        rowKey={(t) => t.id}
        currentPage={page}
        totalPages={lastPage}
        totalItems={total}
        onPageChange={setPage}
      />

      <ToastContainer />
    </div>
  );
}
