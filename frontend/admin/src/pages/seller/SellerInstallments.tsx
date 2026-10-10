import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import {
  decideStoreInstallment,
  getStoreInstallmentSettings,
  getStoreInstallments,
  saveStoreInstallmentSettings,
} from "../../services/seller.services";

interface Term {
  months: number;
  monthly_rate: number;
}

interface PlanPayment {
  id: number;
  number: number;
  amount: string;
  due_date: string;
  status: "pending" | "paid" | "cancelled";
  is_overdue: boolean;
}

interface CustomerProfile {
  tier: string;
  total_spent: number;
  email_verified: boolean;
  completed_orders_here: number;
  completed_plans: number;
  has_overdue: boolean;
  outstanding: number;
}

interface Plan {
  id: number;
  order_id: number;
  status: "pending_approval" | "active" | "completed" | "rejected" | "cancelled";
  principal: string;
  months: number;
  monthly_rate: string;
  total_interest: string;
  total_payable: string;
  decision_note: string | null;
  created_at: string;
  paid_amount: number;
  remaining_amount: number;
  overdue_count: number;
  product_names: string[];
  payments: PlanPayment[];
  customer: { id: number; name: string; email: string; phone: string | null };
  customer_profile: CustomerProfile | null;
}

const FILTERS = [
  { value: "pending_approval", label: "Chờ duyệt" },
  { value: "active", label: "Đang trả góp" },
  { value: "overdue", label: "Quá hạn" },
  { value: "completed", label: "Đã tất toán" },
  { value: "rejected", label: "Đã từ chối" },
  { value: "", label: "Tất cả" },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending_approval: { label: "Chờ bạn duyệt", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  active: { label: "Đang trả góp", className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  completed: { label: "Đã tất toán", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  rejected: { label: "Đã từ chối", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  cancelled: { label: "Đã hủy", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const inputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500";

function SettingsCard({ storeId, storeName }: { storeId: number; storeName: string }) {
  const [enabled, setEnabled] = useState(false);
  const [minOrder, setMinOrder] = useState("3000000");
  const [terms, setTerms] = useState<Term[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStoreInstallmentSettings(storeId)
      .then((s) => {
        setEnabled(s.enabled);
        setMinOrder(String(s.min_order));
        setTerms(s.options);
      })
      .catch(() => notifyError("Không tải được cấu hình trả góp"));
  }, [storeId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveStoreInstallmentSettings(storeId, {
        enabled,
        min_order: Number(minOrder),
        terms: terms.map((t) => ({ months: Number(t.months), monthly_rate: Number(t.monthly_rate) })),
      });
      notifySuccess(res?.message ?? "Đã lưu");
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      notifyError(errors ? (Object.values(errors).flat()[0] as string) : (err?.response?.data?.message ?? "Lưu thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-sans text-base font-semibold text-gray-100">Điều kiện bán trả góp của {storeName}</h3>
          <p className="mt-1 text-xs text-gray-500">
            Bạn là bên cho vay: khách chọn kỳ hạn, bạn xem từng yêu cầu rồi quyết định chấp nhận hay từ chối. Tiền mỗi kỳ
            khách trả (trừ hoa hồng sàn trên phần gốc) về ví của bạn, toàn bộ tiền lãi thuộc về bạn.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
          Mở bán trả góp
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
        <label className="text-xs text-gray-400">
          Giá trị đơn tối thiểu (đ)
          <input type="number" min={0} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className={`${inputClass} mt-1`} />
        </label>

        <div>
          <p className="text-xs text-gray-400">Kỳ hạn và lãi (lãi phẳng, % mỗi tháng trên số gốc)</p>
          <div className="mt-1 space-y-2">
            {terms.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  max={36}
                  value={t.months}
                  onChange={(e) => setTerms(terms.map((x, idx) => (idx === i ? { ...x, months: Number(e.target.value) } : x)))}
                  className={`${inputClass} max-w-[110px]`}
                />
                <span className="text-xs text-gray-500">tháng · lãi</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={t.monthly_rate}
                  onChange={(e) => setTerms(terms.map((x, idx) => (idx === i ? { ...x, monthly_rate: Number(e.target.value) } : x)))}
                  className={`${inputClass} max-w-[110px]`}
                />
                <span className="text-xs text-gray-500">%/tháng</span>
                {terms.length > 1 && (
                  <button type="button" onClick={() => setTerms(terms.filter((_, idx) => idx !== i))} className="text-xs text-rose-400 hover:text-rose-300">
                    Xoá
                  </button>
                )}
              </div>
            ))}
          </div>
          {terms.length < 6 && (
            <button
              type="button"
              onClick={() => setTerms([...terms, { months: 9, monthly_rate: 1 }])}
              className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              + Thêm kỳ hạn
            </button>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        Lưu điều kiện
      </button>
    </form>
  );
}

function ProfileLine({ p }: { p: CustomerProfile }) {
  return (
    <div className="mt-3 grid gap-x-6 gap-y-1 rounded-lg bg-gray-800/50 p-3 text-xs text-gray-400 sm:grid-cols-2">
      <span>
        Hạng thành viên: <b className="text-gray-200">{p.tier}</b> · đã chi {formatMoneyVietNam(p.total_spent)}
      </span>
      <span>
        Email: <b className={p.email_verified ? "text-emerald-400" : "text-amber-400"}>{p.email_verified ? "đã xác thực" : "chưa xác thực"}</b>
      </span>
      <span>
        Đã mua thành công tại shop bạn: <b className="text-gray-200">{p.completed_orders_here} đơn</b>
      </span>
      <span>
        Khoản trả góp đã tất toán: <b className="text-gray-200">{p.completed_plans}</b> · dư nợ hiện tại{" "}
        <b className="text-gray-200">{formatMoneyVietNam(p.outstanding)}</b>
      </span>
      {p.has_overdue && <span className="font-semibold text-rose-400">Đang có kỳ trả góp quá hạn ở khoản vay khác</span>}
    </div>
  );
}

export default function SellerInstallments() {
  const { activeStore } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState("pending_approval");
  const storeId = activeStore?.id;

  const load = () => {
    if (!storeId) return;
    getStoreInstallments(storeId, { status: filter === "overdue" ? undefined : filter, overdue: filter === "overdue" })
      .then((res) => {
        setPlans(res?.data?.data ?? []);
        setPendingCount(res?.stats?.pending_approval ?? 0);
      })
      .catch(() => notifyError("Không tải được danh sách trả góp"));
  };

  useEffect(load, [storeId, filter]);

  if (!activeStore || !storeId) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="font-sans text-2xl font-bold text-white">Trả góp</h2>
        <p className="text-sm text-gray-400">Bạn cần tạo/chọn 1 gian hàng trước.</p>
      </div>
    );
  }

  const decide = async (plan: Plan, decision: "approve" | "reject") => {
    let note: string | undefined;
    if (decision === "reject") {
      note = window.prompt("Lý do từ chối (khách sẽ thấy). Đơn hàng sẽ bị huỷ:") ?? undefined;
      if (note === undefined) return;
    } else if (
      !window.confirm(
        `Chấp nhận cho ${plan.customer.name} vay trả góp ${formatMoneyVietNam(Number(plan.principal))} trong ${plan.months} tháng?\nBạn chịu rủi ro nếu khách không trả đủ.`,
      )
    ) {
      return;
    }

    try {
      const res = await decideStoreInstallment(storeId, plan.id, { decision, note });
      notifySuccess(res?.message ?? "Đã xử lý");
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Xử lý thất bại");
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">Bán trả góp</h2>

      <SettingsCard storeId={storeId} storeName={activeStore.name} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {f.label}
              {f.value === "pending_approval" && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {plans.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Không có yêu cầu nào.</p>}

        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-100">
                  {plan.customer.name} <span className="text-xs font-normal text-gray-500">· đơn #{plan.order_id}</span>
                </p>
                <p className="text-xs text-gray-400">
                  {plan.customer.email}
                  {plan.customer.phone ? ` · ${plan.customer.phone}` : ""}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-gray-300">{plan.product_names.join(", ")}</p>
              </div>
              <div className="text-right">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_META[plan.status].className}`}>
                  {STATUS_META[plan.status].label}
                </span>
                {plan.overdue_count > 0 && <p className="mt-1 text-xs font-semibold text-rose-400">{plan.overdue_count} kỳ quá hạn</p>}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-400 sm:grid-cols-4">
              <div>
                <p>Khoản vay</p>
                <p className="text-sm font-bold text-gray-100">{formatMoneyVietNam(Number(plan.principal))}</p>
              </div>
              <div>
                <p>Kỳ hạn · lãi</p>
                <p className="text-sm font-bold text-gray-100">
                  {plan.months} tháng · {Number(plan.monthly_rate)}%
                </p>
              </div>
              <div>
                <p>Tiền lãi bạn nhận</p>
                <p className="text-sm font-bold text-emerald-400">{formatMoneyVietNam(Number(plan.total_interest))}</p>
              </div>
              <div>
                <p>Đã thu / còn lại</p>
                <p className="text-sm font-bold text-gray-100">
                  {formatMoneyVietNam(plan.paid_amount)} / {formatMoneyVietNam(plan.remaining_amount)}
                </p>
              </div>
            </div>

            {plan.customer_profile && <ProfileLine p={plan.customer_profile} />}
            {plan.decision_note && <p className="mt-2 text-xs text-gray-500">Ghi chú: {plan.decision_note}</p>}

            {(plan.status === "active" || plan.status === "completed") && (
              <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                {plan.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-1.5 text-gray-300">
                    <span>
                      Kỳ {p.number} · {new Date(p.due_date).toLocaleDateString("vi-VN")}
                    </span>
                    <span className={p.status === "paid" ? "text-emerald-400" : p.is_overdue ? "text-rose-400" : "text-gray-400"}>
                      {formatMoneyVietNam(Number(p.amount))} · {p.status === "paid" ? "đã trả" : p.is_overdue ? "quá hạn" : "chờ trả"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {plan.status === "pending_approval" && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-800 pt-3">
                <button
                  onClick={() => decide(plan, "approve")}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Chấp nhận cho vay
                </button>
                <button
                  onClick={() => decide(plan, "reject")}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Từ chối & huỷ đơn
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <ToastContainer />
    </div>
  );
}
