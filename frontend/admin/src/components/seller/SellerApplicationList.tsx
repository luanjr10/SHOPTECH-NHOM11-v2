import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { User } from "lucide-react";
import DataTable, { Column } from "../common/DataTable";
import RowActions from "../common/RowActions";
import SellerApplicationDetailModal from "./SellerApplicationDetailModal";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { formatDate } from "../../helpers/formatDate";
import {
  approveSellerApplication,
  getSellerApplications,
  rejectSellerApplication,
} from "../../services/marketplace.services";
import {
  SellerApplication,
  SellerApplicationStatus,
} from "../../types/sellerApplication.types";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
  { value: "", label: "Tất cả" },
];

const STATUS_BADGE: Record<SellerApplicationStatus, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const STATUS_LABEL: Record<SellerApplicationStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export default function SellerApplicationList() {
  const [items, setItems] = useState<SellerApplication[]>([]);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });

  const [selected, setSelected] = useState<SellerApplication | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const load = () => {
    getSellerApplications(status, page).then((res) => {
      const paginator = res?.data ?? {};
      setItems(paginator.data ?? []);
      setMeta({
        last_page: paginator.last_page ?? 1,
        total: paginator.total ?? 0,
      });
    });
  };

  useEffect(load, [status, page]);

  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const openDetail = (app: SellerApplication) => {
    setSelected(app);
    setModalOpen(true);
  };

  const handleApprove = async (id: number) => {
    setProcessing(true);
    try {
      await approveSellerApplication(id);
      notifySuccess("Đã duyệt — người dùng trở thành người bán");
      setModalOpen(false);
      load();
    } catch {
      notifyError("Duyệt thất bại");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: number, reason: string) => {
    setProcessing(true);
    try {
      await rejectSellerApplication(id, reason || undefined);
      notifySuccess("Đã từ chối đơn đăng ký");
      setModalOpen(false);
      load();
    } catch {
      notifyError("Từ chối thất bại");
    } finally {
      setProcessing(false);
    }
  };

  const columns: Column<SellerApplication>[] = [
    {
      header: "NGƯỜI ĐĂNG KÝ",
      render: (app) => (
        <div className="flex min-w-0 items-center gap-3 group">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-indigo-400 transition-transform duration-200 group-hover:scale-105">
            <User className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 max-w-xs">
            <div className="truncate font-semibold text-gray-200 group-hover:text-indigo-400 transition-colors">
              {app.user?.name ?? "—"}
            </div>
            <div className="truncate text-xs text-gray-500">
              @{app.user?.username} · {app.user?.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "GIAN HÀNG DỰ KIẾN",
      render: (app) => (
        <span className="font-medium text-gray-200">{app.shop_name}</span>
      ),
    },
    {
      header: "LIÊN HỆ",
      render: (app) => (
        <div className="text-gray-400">
          <div>{app.phone || "—"}</div>
          {app.address && (
            <div className="truncate text-xs text-gray-500">{app.address}</div>
          )}
        </div>
      ),
    },
    {
      header: "TRẠNG THÁI",
      align: "center",
      render: (app) => (
        <div className="flex justify-center">
          <span
            className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[app.status]}`}
          >
            {STATUS_LABEL[app.status]}
          </span>
        </div>
      ),
    },
    {
      header: "NGÀY GỬI",
      render: (app) => (
        <span className="whitespace-nowrap text-gray-400">
          {formatDate(app.created_at)}
        </span>
      ),
    },
    {
      header: "THAO TÁC",
      align: "right",
      render: (app) => <RowActions onView={() => openDetail(app)} />,
    },
  ];

  const filters = (
    <div className="flex flex-wrap gap-2">
      {STATUS_FILTERS.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => changeStatus(t.value)}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
            status === t.value
              ? "bg-indigo-600 text-white"
              : "border border-gray-800 bg-[#0e1726]/60 text-gray-300 hover:bg-gray-800"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <DataTable
        title="Đơn Đăng Ký Người Bán"
        subtitle="Xét duyệt các yêu cầu mở gian hàng từ khách hàng."
        data={items}
        columns={columns}
        rowKey={(item) => item.id}
        currentPage={page}
        totalPages={meta.last_page}
        totalItems={meta.total}
        onPageChange={setPage}
        filters={filters}
      />
      <ToastContainer />

      <SellerApplicationDetailModal
        open={modalOpen}
        application={selected}
        processing={processing}
        onClose={() => setModalOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  );
}
