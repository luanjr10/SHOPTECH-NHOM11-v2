import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Link2, Loader2, Store, Wallet } from "lucide-react";
import { formatPrice } from "../../libs/format";
import { type ApiError } from "../../libs/api";
import {
  getAffiliateCommissions,
  getAffiliateSummary,
  getAffiliateWithdrawals,
  requestAffiliateWithdrawal,
  type AffiliateCommission,
  type AffiliateStoreSummary,
  type AffiliateSummary,
  type AffiliateWithdrawal,
} from "../../services/affiliate";

const WITHDRAWAL_STATUS: Record<string, { label: string; style: string }> = {
  pending: { label: "Chờ gian hàng chi trả", style: "bg-amber-50 text-amber-600" },
  approved: { label: "Đã chuyển", style: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Từ chối", style: "bg-red-50 text-red-600" },
};

const formatDate = (value: string) => new Date(value).toLocaleDateString("vi-VN");

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 font-sans text-[13px] outline-none focus:border-primary500";

function StoreCard({
  entry,
  onWithdrawn,
}: {
  entry: AffiliateStoreSummary;
  onWithdrawn: () => void;
}) {
  const { store, settings, balances } = entry;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", momo_phone: "", account_holder: "" });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await requestAffiliateWithdrawal({ ...form, amount: Number(form.amount), store_id: store.id });
      setNotice({ ok: true, text: res.message });
      setForm({ amount: "", momo_phone: "", account_holder: "" });
      setOpen(false);
      onWithdrawn();
    } catch (err) {
      setNotice({ ok: false, text: (err as ApiError)?.message ?? "Gửi yêu cầu thất bại" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary500/10 text-primary500">
            <Store className="size-4" />
          </span>
          <div>
            <Link to={`/gian-hang/${store.slug}`} className="font-sans text-[14px] font-bold text-gray-800 hover:text-primary500">
              {store.name}
            </Link>
            <p className="font-sans text-[12px] text-gray-500">
              {settings.enabled
                ? `Hoa hồng ${settings.rate}% · đối soát ${settings.hold_days} ngày · rút từ ${formatPrice(settings.min_withdrawal)}`
                : "Gian hàng đã tạm dừng chương trình (hoa hồng cũ vẫn được trả)"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={balances.available < settings.min_withdrawal}
          className="flex items-center gap-1.5 rounded-lg bg-primary500 px-3 py-1.5 font-sans text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Wallet className="size-3.5" /> Rút tiền
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Có thể rút", value: balances.available, tone: "text-emerald-600" },
          { label: "Chờ đối soát", value: balances.pending, tone: "text-gray-800" },
          { label: "Chờ chi trả", value: balances.withdrawing, tone: "text-gray-800" },
          { label: "Đã nhận", value: balances.withdrawn, tone: "text-gray-800" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="font-sans text-[11px] text-gray-500">{item.label}</p>
            <p className={`font-sans text-[14px] font-bold ${item.tone}`}>{formatPrice(item.value)}</p>
          </div>
        ))}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-gray-100 p-3 sm:grid-cols-2">
          <input
            required
            type="number"
            min={settings.min_withdrawal}
            max={balances.available}
            placeholder="Số tiền muốn rút"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className={inputClass}
          />
          <input required inputMode="tel" placeholder="Số điện thoại ví MoMo" value={form.momo_phone} onChange={(e) => setForm({ ...form, momo_phone: e.target.value })} className={inputClass} />
          <input required placeholder="Tên chủ ví MoMo" value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} className={`${inputClass} sm:col-span-2`} />
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary500 px-4 py-2 font-sans text-[13px] font-semibold text-white disabled:opacity-60 sm:col-span-2"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Rút về ví MoMo — gửi yêu cầu cho {store.name}
          </button>
        </form>
      )}
      {notice && (
        <p className={`mt-2 font-sans text-[13px] ${notice.ok ? "text-emerald-600" : "text-red-600"}`}>{notice.text}</p>
      )}
    </div>
  );
}

function AffiliateTab() {
  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<AffiliateWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, c, w] = await Promise.all([
        getAffiliateSummary(),
        getAffiliateCommissions(),
        getAffiliateWithdrawals(),
      ]);
      setSummary(s);
      setCommissions(c);
      setWithdrawals(w);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !summary) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary500 to-red-700 p-4 text-white shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="size-5" />
            <h2 className="font-sans text-[16px] font-bold !text-white">Ví affiliate</h2>
          </div>
          <Link
            to="/affiliate"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 font-sans text-[12px] font-semibold text-white hover:bg-white/25"
          >
            <Link2 className="size-3.5" /> Chọn sản phẩm để giới thiệu
          </Link>
        </div>
        <p className="mt-3 font-sans text-[12px] text-white/80">Có thể rút (tất cả gian hàng)</p>
        <p className="font-sans text-[26px] font-extrabold">{formatPrice(summary.totals.available)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 font-sans text-[12px]">
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <p className="text-white/80">Chờ đối soát</p>
            <p className="font-bold">{formatPrice(summary.totals.pending)}</p>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <p className="text-white/80">Chờ chi trả</p>
            <p className="font-bold">{formatPrice(summary.totals.withdrawing)}</p>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <p className="text-white/80">Đã nhận</p>
            <p className="font-bold">{formatPrice(summary.totals.withdrawn)}</p>
          </div>
        </div>
      </div>

      <h3 className="font-sans text-[15px] font-bold text-gray-800">Hoa hồng theo gian hàng</h3>
      {summary.stores.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center font-sans text-[13px] text-gray-400">
          Chưa có hoa hồng. Vào mục Affiliate, chọn sản phẩm và gửi link cho bạn bè — đơn hoàn thành là hoa hồng về ví tại đây.
        </p>
      ) : (
        summary.stores.map((entry) => <StoreCard key={entry.store.id} entry={entry} onWithdrawn={load} />)
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="font-sans text-[15px] font-bold text-gray-800">Hoa hồng nhận được</h3>
        {commissions.length === 0 ? (
          <p className="mt-3 font-sans text-[13px] text-gray-400">Chưa có hoa hồng nào.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {commissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-sans text-[13px] font-semibold text-gray-700">
                    {c.referred_user?.name ?? "Khách hàng"} · {c.store?.name} · đơn {formatPrice(Number(c.order_amount))}
                  </p>
                  <p className="font-sans text-[11px] text-gray-400">
                    {formatDate(c.created_at)} ·{" "}
                    {c.status === "cancelled"
                      ? "Đã hủy (đơn hoàn trả)"
                      : new Date(c.available_at) > new Date()
                        ? `Rút được từ ${formatDate(c.available_at)}`
                        : "Có thể rút"}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-sans text-[13px] font-bold ${
                    c.status === "cancelled" ? "text-gray-400 line-through" : "text-emerald-600"
                  }`}
                >
                  +{formatPrice(Number(c.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="font-sans text-[15px] font-bold text-gray-800">Lịch sử rút tiền</h3>
        {withdrawals.length === 0 ? (
          <p className="mt-3 font-sans text-[13px] text-gray-400">Chưa có yêu cầu rút nào.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {withdrawals.map((w) => {
              const status = WITHDRAWAL_STATUS[w.status];
              return (
                <li key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-sans text-[13px] font-semibold text-gray-700">
                      {formatPrice(Number(w.amount))} · {w.store?.name} · {w.bank_name} {w.bank_account}
                    </p>
                    <p className="font-sans text-[11px] text-gray-400">
                      {formatDate(w.created_at)}
                      {w.note ? ` · ${w.note}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${status.style}`}>
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AffiliateTab;
