import { useEffect, useMemo, useState } from "react";
import { ToastContainer } from "react-toastify";
import { Eye } from "lucide-react";
import { notifyError, notifySuccess } from "../helpers/notify";
import { getAdminStores, setStoreStatus } from "../services/marketplace.services";
import DataTable, { Column } from "../components/common/DataTable";
import StoreDetailModal, { StoreDetail } from "../components/store/StoreDetailModal";
import { useModulePermission } from "../hooks/useModulePermission";

type Store = StoreDetail;

const STATUS_TABS = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Đã ẩn" },
  { value: "", label: "Tất cả" },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Chờ duyệt",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  active: {
    label: "Đang hoạt động",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  inactive: {
    label: "Đã ẩn",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.inactive;
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

const actionBtn =
  "rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition";

export default function ManageStoresPage() {
  const [items, setItems] = useState<Store[]>([]);
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Store | null>(null);
  const { canEdit } = useModulePermission("stores");

  const load = () => {
    getAdminStores(status || undefined).then((res) =>
      setItems(res?.data?.data ?? res?.data ?? []),
    );
  };

  useEffect(load, [status]);

  const change = async (
    id: number,
    next: "active" | "inactive",
    msg: string,
  ) => {
    try {
      await setStoreStatus(id, next);
      notifySuccess(msg);
      setViewing(null);
      load();
    } catch {
      notifyError("Thao tác thất bại");
    }
  };

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return items;
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(kw) ||
        s.slug?.toLowerCase().includes(kw) ||
        s.seller_profile?.user?.name?.toLowerCase().includes(kw),
    );
  }, [items, search]);

  const columns: Column<Store>[] = [
    {
      header: "Gian hàng",
      render: (s) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-gray-200">{s.name}</div>
          <div className="text-xs text-gray-500">/{s.slug}</div>
        </div>
      ),
    },
    {
      header: "Chủ gian hàng",
      render: (s) => (
        <span className="text-gray-300">
          {s.seller_profile?.user?.name ?? "—"}
        </span>
      ),
    },
    {
      header: "Sản phẩm",
      render: (s) => <span className="text-gray-300">{s.products_count ?? 0}</span>,
    },
    {
      header: "Trạng thái",
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      header: "Thao tác",
      align: "center",
      render: (s) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setViewing(s)}
            className={`${actionBtn} inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500`}
          >
            <Eye className="h-3.5 w-3.5" /> Chi tiết
          </button>
          {canEdit && s.status === "pending" && (
            <>
              <button
                onClick={() => change(s.id, "active", "Đã duyệt gian hàng")}
                className={`${actionBtn} bg-emerald-600 hover:bg-emerald-500`}
              >
                Duyệt
              </button>
              <button
                onClick={() => change(s.id, "inactive", "Đã từ chối gian hàng")}
                className={`${actionBtn} bg-rose-600 hover:bg-rose-500`}
              >
                Từ chối
              </button>
            </>
          )}
          {canEdit && s.status === "active" && (
            <button
              onClick={() => change(s.id, "inactive", "Đã tạm ẩn gian hàng")}
              className={`${actionBtn} bg-slate-700 hover:bg-slate-600`}
            >
              Tạm ẩn
            </button>
          )}
          {canEdit && s.status === "inactive" && (
            <button
              onClick={() => change(s.id, "active", "Đã kích hoạt gian hàng")}
              className={`${actionBtn} bg-emerald-600 hover:bg-emerald-500`}
            >
              Kích hoạt
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">
        Quản Lý Gian Hàng
      </h2>

      <DataTable
        title="Danh Sách Gian Hàng"
        subtitle="Duyệt và quản lý các gian hàng của người bán."
        data={filtered}
        columns={columns}
        rowKey={(s) => s.id}
        totalItems={filtered.length}
        searchValue={search}
        onSearch={setSearch}
        filters={
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setStatus(t.value)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  status === t.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <StoreDetailModal
        open={!!viewing}
        store={viewing}
        onClose={() => setViewing(null)}
        onApprove={canEdit ? (id) => change(id, "active", "Đã duyệt gian hàng") : undefined}
        onReject={canEdit ? (id) => change(id, "inactive", "Đã từ chối gian hàng") : undefined}
        onDeactivate={canEdit ? (id) => change(id, "inactive", "Đã tạm ẩn gian hàng") : undefined}
        onActivate={canEdit ? (id) => change(id, "active", "Đã kích hoạt gian hàng") : undefined}
      />

      <ToastContainer />
    </div>
  );
}
