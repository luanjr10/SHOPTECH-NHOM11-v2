import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Landmark, Loader2, XCircle } from "lucide-react";
import { formatPrice } from "../../libs/format";
import { type ApiError } from "../../libs/api";
import {
  getInstallmentPlans,
  payInstallment,
  type InstallmentPlan,
  type InstallmentPlanStatus,
  type InstallmentSummary,
} from "../../services/installments";

const PLAN_STATUS: Record<InstallmentPlanStatus, { label: string; style: string }> = {
  pending_approval: { label: "Chờ gian hàng duyệt", style: "bg-amber-50 text-amber-600" },
  active: { label: "Đang trả góp", style: "bg-blue-50 text-blue-600" },
  completed: { label: "Đã tất toán", style: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Bị từ chối", style: "bg-rose-50 text-rose-600" },
  cancelled: { label: "Đã hủy", style: "bg-gray-100 text-gray-500" },
};

const formatDate = (value: string) => new Date(value).toLocaleDateString("vi-VN");

function InstallmentsTab() {
  const [params] = useSearchParams();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [summary, setSummary] = useState<InstallmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payResult = params.get("pay");
  const justRequested = params.get("requested") === "1";

  useEffect(() => {
    getInstallmentPlans()
      .then((res) => {
        setPlans(res.plans);
        setSummary(res.summary);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePay = async (paymentId: number) => {
    setPayingId(paymentId);
    setError(null);
    try {
      window.location.href = await payInstallment(paymentId);
    } catch (err) {
      setError((err as ApiError)?.message ?? "Không tạo được phiên thanh toán");
      setPayingId(null);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {justRequested && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 font-sans text-[13px] font-medium text-emerald-700">
          Đã gửi yêu cầu trả góp. Gian hàng sẽ xem xét và báo kết quả qua email; được chấp nhận thì bạn thanh toán kỳ 1 ngay
          tại đây.
        </p>
      )}
      {payResult && (
        <p
          className={`rounded-lg px-3 py-2 font-sans text-[13px] font-medium ${
            payResult === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
          }`}
        >
          {payResult === "success"
            ? "Thanh toán kỳ trả góp thành công. Cảm ơn bạn!"
            : "Thanh toán thất bại hoặc bị hủy. Kỳ trả góp vẫn chưa được ghi nhận, bạn có thể thử lại."}
        </p>
      )}

      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Landmark className="size-5 text-blue-600" />
          <h2 className="font-sans text-[16px] font-bold text-gray-800">Trả góp của tôi</h2>
        </div>
        <p className="mt-2 font-sans text-[13px] text-gray-600">
          Mỗi gian hàng tự đặt điều kiện trả góp. Bạn chọn kỳ hạn ở bước thanh toán, gian hàng xem yêu cầu và quyết định cho
          vay. Được chấp nhận, bạn trả kỳ 1 qua MoMo rồi gian hàng chuẩn bị hàng; các kỳ sau đến hạn mỗi tháng.
        </p>
        <div className="mt-3 flex flex-wrap gap-6 font-sans text-[13px] text-gray-500">
          <span>
            Dư nợ gốc hiện tại: <b className="text-gray-800">{formatPrice(summary.outstanding)}</b>
          </span>
        </div>
        {summary.has_overdue && (
          <p className="mt-2 flex items-center gap-1.5 font-sans text-[12px] font-semibold text-rose-600">
            <AlertTriangle className="size-4" /> Bạn có kỳ trả góp quá hạn. Hãy thanh toán để tiếp tục đăng ký trả góp.
          </p>
        )}
      </div>

      {error && <p className="font-sans text-[13px] text-rose-600">{error}</p>}

      {plans.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center font-sans text-[13px] text-gray-400">
          Bạn chưa có khoản trả góp nào. Chọn "Trả góp" ở bước thanh toán khi gian hàng có mở bán trả góp.
        </p>
      ) : (
        plans.map((plan) => {
          const status = PLAN_STATUS[plan.status];
          const nextPayable =
            plan.status === "active" ? plan.payments.find((p) => p.status === "pending") : undefined;

          return (
            <div key={plan.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-sans text-[14px] font-bold text-gray-800">
                    Đơn #{plan.order_id}
                    {plan.store && <span className="ml-2 font-normal text-gray-400">· {plan.store.name}</span>}
                  </p>
                  <p className="line-clamp-1 font-sans text-[12px] text-gray-500">{plan.product_names.join(", ")}</p>
                </div>
                <span className={`rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${status.style}`}>
                  {status.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 font-sans text-[12px] text-gray-600 sm:grid-cols-4">
                <div>
                  <p className="text-gray-400">Giá trị khoản vay</p>
                  <p className="font-semibold text-gray-800">{formatPrice(plan.principal)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Kỳ hạn / Lãi</p>
                  <p className="font-semibold text-gray-800">
                    {plan.months} tháng · {plan.monthly_rate}%/tháng
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Đã trả</p>
                  <p className="font-semibold text-emerald-600">{formatPrice(plan.paid_amount)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Còn phải trả</p>
                  <p className="font-semibold text-rose-500">{formatPrice(plan.remaining_amount)}</p>
                </div>
              </div>

              {plan.status === "pending_approval" && (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 font-sans text-[12px] text-amber-700">
                  <Clock className="size-4 shrink-0" /> Đang chờ {plan.store?.name ?? "gian hàng"} xem xét yêu cầu. Bạn sẽ
                  nhận email khi có kết quả.
                </p>
              )}

              {plan.status === "rejected" && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 font-sans text-[12px] text-rose-700">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {plan.store?.name ?? "Gian hàng"} không chấp nhận yêu cầu này và đơn hàng đã được hủy.
                    {plan.decision_note && <b className="ml-1">Lý do: {plan.decision_note}</b>}
                  </span>
                </p>
              )}

              {plan.status === "active" && plan.decision_note && (
                <p className="mt-3 font-sans text-[12px] text-gray-500">Lời nhắn từ gian hàng: {plan.decision_note}</p>
              )}

              {(plan.status === "active" || plan.status === "completed") && (
                <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {plan.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="font-sans text-[13px]">
                        <span className="font-semibold text-gray-700">Kỳ {p.number}</span>
                        <span className="ml-2 text-gray-400">Hạn {formatDate(p.due_date)}</span>
                        {p.is_overdue && <span className="ml-2 font-semibold text-rose-500">Quá hạn</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-sans text-[13px] font-semibold text-gray-800">
                          {formatPrice(Number(p.amount))}
                        </span>
                        {p.status === "paid" ? (
                          <CheckCircle2 className="size-5 text-emerald-500" />
                        ) : p.status === "cancelled" ? (
                          <span className="font-sans text-[12px] text-gray-400">Đã hủy</span>
                        ) : nextPayable?.id === p.id ? (
                          <button
                            type="button"
                            disabled={payingId === p.id}
                            onClick={() => handlePay(p.id)}
                            className="rounded-lg bg-[#a50064] px-3 py-1.5 font-sans text-[12px] font-semibold text-white disabled:opacity-60"
                          >
                            {payingId === p.id ? "Đang chuyển..." : p.number === 1 ? "Thanh toán kỳ 1 qua MoMo" : "Trả qua MoMo"}
                          </button>
                        ) : (
                          <span className="font-sans text-[12px] text-gray-400">Chờ đến hạn</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default InstallmentsTab;
