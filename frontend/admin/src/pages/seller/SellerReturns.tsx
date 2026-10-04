import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { getStoreReturns } from "../../services/seller.services";
import { formatDate } from "../../helpers/formatDate";
import DataTable, { Column } from "../../components/common/DataTable";
import ReturnDetailModal from "../../components/returns/ReturnDetailModal";
import type { ReturnRequestItem } from "../../types/seller.types";

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Đã từ chối" },
];

const TYPE_LABEL: Record<string, string> = { return: "Hoàn trả", warranty: "Bảo hành" };

const STATUS_META: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xử lý",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
};

export default function SellerReturns() {
  const { activeStore } = useAuth();
  const [items, setItems] = useState<ReturnRequestItem[]>([]);
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewing, setViewing] = useState<ReturnRequestItem | null>(null);

  const load = useCallback(() => {
    if (!activeStore) return;
    getStoreReturns(activeStore.id, status || undefined, currentPage).then((res) => {
      const page = res?.data;
      setItems(page?.data ?? []);
      setTotalPages(page?.last_page ?? 1);
      setTotalItems(page?.total ?? 0);
    });
  }, [activeStore, status, currentPage]);

  useEffect(load, [load]);

  const handleResponded = () => {
    setViewing(null);
    load();
  };

  if (!activeStore) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="font-sans text-2xl font-bold text-white">Hoàn trả / Bảo hành</h2>
        <p className="text-sm text-gray-400">Bạn cần tạo/chọn 1 gian hàng trước.</p>
      </div>
    );
  }

  const columns: Column<ReturnRequestItem>[] = [
    {
      header: "Sản phẩm",
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-gray-200">{r.order_item?.product_name ?? "—"}</div>
          <div className="text-xs text-gray-500">SL: {r.order_item?.quantity ?? "—"}</div>
        </div>
      ),
    },
    {
      header: "Khách hàng",
      render: (r) => (
        <div>
          <div className="text-gray-300">{r.user?.name}</div>
          <div className="text-xs text-gray-500">{r.user?.email}</div>
        </div>
      ),
    },
    {
      header: "Loại",
      align: "center",
      render: (r) => <span className="text-gray-300">{TYPE_LABEL[r.type] ?? r.type}</span>,
    },
    {
      header: "Ngày gửi",
      render: (r) => <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</span>,
    },
    {
      header: "Trạng thái",
      align: "center",
      render: (r) => (
        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_META[r.status]}`}>
          {STATUS_LABEL[r.status]}
        </span>
      ),
    },
    {
      header: "Thao tác",
      align: "center",
      render: (r) => (
        <button
          type="button"
          title="Xem chi tiết"
          className="cursor-pointer p-1 text-gray-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
          onClick={() => setViewing(r)}
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">Hoàn trả / Bảo hành</h2>

      <DataTable
        title="Yêu Cầu Hoàn Trả / Bảo Hành"
        subtitle="Khách hàng gửi yêu cầu kèm ảnh minh chứng — duyệt hoặc từ chối kèm phản hồi (khách nhận được qua email)."
        data={items}
        columns={columns}
        rowKey={(r) => r.id}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        filters={
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setStatus(t.value);
                  setCurrentPage(1);
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  status === t.value ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <ReturnDetailModal
        open={!!viewing}
        storeId={activeStore.id}
        returnRequest={viewing}
        onClose={() => setViewing(null)}
        onResponded={handleResponded}
      />

      <ToastContainer />
    </div>
  );
}
