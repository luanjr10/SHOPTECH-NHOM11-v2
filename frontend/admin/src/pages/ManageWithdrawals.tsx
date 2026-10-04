import { useEffect, useMemo, useState } from "react";
import { ToastContainer } from "react-toastify";
import { Eye } from "lucide-react";
import { notifyError, notifySuccess } from "../helpers/notify";
import { formatMoneyVietNam } from "../helpers/formatMoney";
import { PAYOUT_METHOD_LABEL } from "../helpers/paymentMethods";
import {
  approveWithdrawal,
  createWithdrawalPayment,
  getWithdrawals,
  rejectWithdrawal,
} from "../services/marketplace.services";
import DataTable, { Column } from "../components/common/DataTable";
import WithdrawalDetailModal, { WithdrawalDetail } from "../components/withdrawal/WithdrawalDetailModal";
import { useModulePermission } from "../hooks/useModulePermission";

type Withdrawal = WithdrawalDetail;

const STATUS_TABS = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
  { value: "", label: "Tất cả" },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Chờ duyệt",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  approved: {
    label: "Đã duyệt",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  rejected: {
    label: "Từ chối",
    className: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
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

export default function ManageWithdrawalsPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Withdrawal | null>(null);
  const { canEdit } = useModulePermission("withdrawals");

  const load = () => {
    getWithdrawals(status || undefined).then((res) =>
      setItems(res?.data?.data ?? res?.data ?? []),
    );
  };

  useEffect(load, [status]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payout = params.get("payout");
    if (!payout) return;

    if (payout === "success") {
      notifySuccess("Đã giải ngân thành công qua sandbox");
    } else {
      notifyError("Thanh toán trên sandbox thất bại hoặc bị huỷ — yêu cầu vẫn ở trạng thái chờ duyệt");
    }
    load();
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (w: Withdrawal) => {
    if (w.method === "cod") {
      try {
        const res = await approveWithdrawal(w.id);
        notifySuccess(res?.message ?? "Đã duyệt yêu cầu rút tiền");
        setViewing(null);
        load();
      } catch {
        notifyError("Duyệt thất bại");
      }
      return;
    }

    try {
      const res = await createWithdrawalPayment(w.id);
      const payUrl = res?.data?.pay_url;
      if (!payUrl) throw new Error("Không lấy được liên kết thanh toán");
      window.location.href = payUrl;
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Không tạo được phiên thanh toán sandbox");
    }
  };

  const handleReject = async (id: number) => {
    const note = window.prompt("Lý do từ chối (tuỳ chọn):") ?? undefined;
    try {
      await rejectWithdrawal(id, note);
      notifySuccess("Đã từ chối — tiền hoàn về ví");
      setViewing(null);
      load();
    } catch {
      notifyError("Từ chối thất bại");
    }
  };

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return items;
    return items.filter(
      (w) =>
        w.seller_profile?.user?.name?.toLowerCase().includes(kw) ||
        w.bank_name?.toLowerCase().includes(kw) ||
        w.bank_account?.toLowerCase().includes(kw),
    );
  }, [items, search]);

  const columns: Column<Withdrawal>[] = [
    {
      header: "Người bán",
      render: (w) => (
        <span className="font-semibold text-gray-200">
          {w.seller_profile?.user?.name ?? "—"}
        </span>
      ),
    },
    {
      header: "Số tiền",
      render: (w) => (
        <span className="font-semibold text-gray-100">
          {formatMoneyVietNam(Number(w.amount))}
        </span>
      ),
    },
    {
      header: "Kênh nhận",
      render: (w) => (
        <span className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
          {PAYOUT_METHOD_LABEL[w.method] ?? w.method}
        </span>
      ),
    },
    {
      header: "Tài khoản nhận",
      render: (w) => (
        <div className="text-xs text-gray-400">
          <div className="text-gray-300">{w.bank_name}</div>
          <div>{w.bank_account}</div>
        </div>
      ),
    },
    {
      header: "Trạng thái",
      render: (w) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={w.status} />
          {w.payout_reference && (
            <span className="font-mono text-[11px] text-gray-500">{w.payout_reference}</span>
          )}
        </div>
      ),
    },
    {
      header: "Thao tác",
      align: "center",
      render: (w) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setViewing(w)}
            className={`${actionBtn} inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500`}
          >
            <Eye className="h-3.5 w-3.5" /> Chi tiết
          </button>
          {canEdit && w.status === "pending" && (
            <>
              <button
                onClick={() => handleApprove(w)}
                className={`${actionBtn} bg-emerald-600 hover:bg-emerald-500`}
              >
                {w.method === "cod" ? "Duyệt" : `Thanh toán qua ${PAYOUT_METHOD_LABEL[w.method] ?? w.method}`}
              </button>
              <button
                onClick={() => handleReject(w.id)}
                className={`${actionBtn} bg-rose-600 hover:bg-rose-500`}
              >
                Từ chối
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">
        Quản Lý Rút Tiền
      </h2>

      <DataTable
        title="Yêu Cầu Rút Tiền"
        subtitle="Duyệt và xử lý các yêu cầu rút tiền từ người bán."
        data={filtered}
        columns={columns}
        rowKey={(w) => w.id}
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

      <WithdrawalDetailModal
        open={!!viewing}
        withdrawal={viewing}
        onClose={() => setViewing(null)}
        onApprove={canEdit ? handleApprove : undefined}
        onReject={canEdit ? handleReject : undefined}
      />

      <ToastContainer />
    </div>
  );
}
