import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { ToastContainer } from "react-toastify";
import { notifyError } from "../helpers/notify";
import { getAdminOrderDetail, getAdminOrders } from "../services/marketplace.services";
import { formatDate } from "../helpers/formatDate";
import { formatMoneyVietNam } from "../helpers/formatMoney";
import DataTable, { Column } from "../components/common/DataTable";
import OrderDetailModal from "../components/order/OrderDetailModal";
import type { AdminOrder } from "../types/order.types";

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ xác nhận", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  paid: { label: "Đã thanh toán", className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  completed: { label: "Hoàn tất", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Đã hủy", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

export default function ManageOrdersPage() {
  const [items, setItems] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewing, setViewing] = useState<AdminOrder | null>(null);

  const load = () => {
    getAdminOrders({ status: status || undefined, page: currentPage, per_page: 15 })
      .then((res) => {
        const page = res?.data;
        setItems(page?.data ?? []);
        setTotalPages(page?.last_page ?? 1);
        setTotalItems(page?.total ?? 0);
      })
      .catch(() => notifyError("Không tải được danh sách đơn hàng"));
  };

  useEffect(load, [status, currentPage]);

  const openDetail = async (id: number) => {
    try {
      const res = await getAdminOrderDetail(id);
      setViewing(res.data);
    } catch {
      notifyError("Không tải được chi tiết đơn hàng");
    }
  };

  const columns: Column<AdminOrder>[] = [
    { header: "Mã đơn", render: (o) => <span className="font-mono text-gray-400">#{o.id}</span> },
    {
      header: "Khách hàng",
      render: (o) => (
        <div>
          <div className="text-gray-200">{o.user?.name ?? "—"}</div>
          <div className="text-xs text-gray-500">@{o.user?.username}</div>
        </div>
      ),
    },
    {
      header: "Tổng tiền",
      align: "right",
      render: (o) => <span className="font-semibold text-gray-100">{formatMoneyVietNam(Number(o.total_amount))}</span>,
    },
    {
      header: "Gian hàng",
      render: (o) => (
        <span className="text-xs text-gray-400">
          {o.seller_orders?.map((so) => so.store?.name).filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      header: "Ngày đặt",
      render: (o) => <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(o.created_at)}</span>,
    },
    {
      header: "Trạng thái",
      align: "center",
      render: (o) => {
        const meta = STATUS_META[o.status] ?? STATUS_META.pending;
        return (
          <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
            {meta.label}
          </span>
        );
      },
    },
    {
      header: "Thao tác",
      align: "center",
      render: (o) => (
        <button
          type="button"
          title="Xem hóa đơn"
          className="cursor-pointer p-1 text-gray-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
          onClick={() => openDetail(o.id)}
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">Quản Lý Đơn Hàng & Hóa Đơn</h2>

      <DataTable
        title="Danh Sách Đơn Hàng"
        subtitle="Toàn bộ đơn hàng trên sàn — xem chi tiết hóa đơn, tải PDF hoặc gửi qua email cho khách hàng."
        data={items}
        columns={columns}
        rowKey={(o) => o.id}
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

      <OrderDetailModal open={!!viewing} order={viewing} onClose={() => setViewing(null)} />

      <ToastContainer />
    </div>
  );
}
