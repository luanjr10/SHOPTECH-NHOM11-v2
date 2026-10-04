import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import {
  driverMarkCancelled,
  driverMarkDelivered,
  getStoreOrderDetail,
  getStoreOrders,
  handoverOrder,
  updateOrderStatus,
} from "../../services/seller.services";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import DataTable, { Column } from "../../components/common/DataTable";
import SellerInvoiceDetailModal from "../../components/order/SellerInvoiceDetailModal";
import { SellerOrderItem } from "../../types/seller.types";

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipping", label: "Đang giao" },
  { value: "delivered", label: "Đã giao hàng" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
];

const STATUS_META: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  confirmed: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  shipping: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  delivered: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export default function SellerOrders() {
  const { activeStore } = useAuth();
  const [orders, setOrders] = useState<SellerOrderItem[]>([]);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<SellerOrderItem | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Đổi gian hàng / tab trạng thái → quay về trang 1
  useEffect(() => setPage(1), [activeStore?.id, status]);

  const load = useCallback(() => {
    if (!activeStore) return;
    getStoreOrders(activeStore.id, status || undefined, page).then((res) => {
      setOrders(res.data?.data ?? []);
      setLastPage(res.data?.last_page ?? 1);
      setTotal(res.data?.total ?? 0);
    });
  }, [activeStore, status, page]);

  useEffect(load, [load]);

  const confirm = async (order: SellerOrderItem) => {
    if (!activeStore) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus(activeStore.id, order.id, "confirmed");
      notifySuccess("Đã xác nhận đơn hàng");
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Xác nhận thất bại");
    } finally {
      setBusyId(null);
    }
  };

  const handover = async (order: SellerOrderItem) => {
    if (!activeStore) return;
    setBusyId(order.id);
    try {
      const res = await handoverOrder(activeStore.id, order.id);
      notifySuccess(res?.message ?? "Đã bàn giao vận chuyển");
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Bàn giao vận chuyển thất bại");
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (order: SellerOrderItem) => {
    if (!activeStore) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus(activeStore.id, order.id, "cancelled");
      notifySuccess("Đã hủy đơn");
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Hủy đơn thất bại");
    } finally {
      setBusyId(null);
    }
  };

  const driverDeliver = async (order: SellerOrderItem) => {
    if (!activeStore) return;
    if (!window.confirm("Xác nhận đã giao đơn hàng này cho khách?")) return;
    setBusyId(order.id);
    try {
      const res = await driverMarkDelivered(activeStore.id, order.id);
      notifySuccess(res?.message ?? "Đã chốt giao hàng thành công");
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Chốt giao hàng thất bại");
    } finally {
      setBusyId(null);
    }
  };

  const driverCancel = async (order: SellerOrderItem) => {
    if (!activeStore) return;
    if (
      !window.confirm(
        "Xác nhận HUỶ đơn này? Hành động không thể hoàn tác — kho sẽ được hoàn lại.",
      )
    ) {
      return;
    }
    setBusyId(order.id);
    try {
      const res = await driverMarkCancelled(activeStore.id, order.id);
      notifySuccess(res?.message ?? "Đã hủy đơn thành công");
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Hủy đơn thất bại");
    } finally {
      setBusyId(null);
    }
  };

  const openInvoice = async (order: SellerOrderItem) => {
    if (!activeStore) return;
    setInvoiceOrder(order);
    setInvoiceOpen(true);
    setInvoiceLoading(true);
    try {
      const res = await getStoreOrderDetail(activeStore.id, order.id);
      setInvoiceOrder(res.data);
    } catch {
      notifyError("Không tải được chi tiết hóa đơn");
      setInvoiceOpen(false);
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (!activeStore) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Đơn hàng & Hóa đơn</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Bạn chưa có gian hàng nào.
        </div>
      </div>
    );
  }

  const columns: Column<SellerOrderItem>[] = [
    { header: "Mã đơn", render: (o) => <span className="font-mono text-gray-500 dark:text-gray-400">#{o.id}</span> },
    {
      header: "Người nhận",
      render: (o) => (
        <div>
          <div className="font-medium text-gray-800 dark:text-white">{o.order?.receiver_name ?? "—"}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{o.order?.receiver_phone}</div>
        </div>
      ),
    },
    { header: "Giá trị", render: (o) => formatMoneyVietNam(Number(o.subtotal)) },
    { header: "Phí ship", render: (o) => formatMoneyVietNam(Number(o.shipping_fee)) },
    { header: "Ngày tạo", render: (o) => formatDate(o.created_at) },
    {
      header: "Trạng thái",
      render: (o) => (
        <div className="flex flex-col gap-1">
          <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_META[o.status]}`}>
            {STATUS_TABS.find((t) => t.value === o.status)?.label ?? o.status}
          </span>
          {o.shipment?.expected_delivery_time && (
            <span className="text-[11px] text-gray-400">
              Dự kiến giao: {formatDate(o.shipment.expected_delivery_time)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Hóa đơn",
      align: "center",
      render: (o) => (
        <button
          type="button"
          title="Xem hóa đơn"
          onClick={() => openInvoice(o)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300 hover:border-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5" /> Xem hóa đơn
        </button>
      ),
    },
    {
      header: "Thao tác",
      align: "center",
      render: (o) => (
        <div className="flex flex-col items-center gap-2">
          {o.status === "pending" && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => confirm(o)}
                disabled={busyId === o.id}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
              >
                Xác nhận
              </button>
              <button
                onClick={() => cancel(o)}
                disabled={busyId === o.id}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                Hủy
              </button>
            </div>
          )}
          {o.status === "confirmed" && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => handover(o)}
                disabled={busyId === o.id}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
              >
                Bàn giao vận chuyển
              </button>
              <button
                onClick={() => cancel(o)}
                disabled={busyId === o.id}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                Hủy
              </button>
            </div>
          )}
          {o.status === "shipping" && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => driverDeliver(o)}
                disabled={busyId === o.id}
                className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                Đã giao cho khách
              </button>
              <button
                onClick={() => driverCancel(o)}
                disabled={busyId === o.id}
                className="w-full rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                Đã hủy (giao thất bại)
              </button>
            </div>
          )}
          {o.status === "delivered" && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Chờ khách xác nhận đã nhận hàng</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Đơn hàng & Hóa đơn</h2>

      <DataTable
        title="Đơn hàng của gian hàng"
        subtitle={activeStore.name}
        data={orders}
        columns={columns}
        rowKey={(o) => o.id}
        currentPage={page}
        totalPages={lastPage}
        totalItems={total}
        onPageChange={setPage}
        filters={
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setStatus(t.value)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  status === t.value
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <SellerInvoiceDetailModal
        open={invoiceOpen}
        storeId={activeStore.id}
        order={invoiceOrder}
        loading={invoiceLoading}
        onClose={() => setInvoiceOpen(false)}
      />

      <ToastContainer />
    </div>
  );
}
