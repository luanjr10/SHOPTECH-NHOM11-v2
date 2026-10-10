import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import {
  getStoreAffiliateCommissions,
  getStoreAffiliateProducts,
  getStoreAffiliateSettings,
  getStoreAffiliateWithdrawals,
  payStoreAffiliateWithdrawal,
  reviewStoreAffiliateWithdrawal,
  saveStoreAffiliateSettings,
  updateStoreAffiliateProducts,
  type StoreAffiliateProduct,
} from "../../services/seller.services";

interface Withdrawal {
  id: number;
  amount: string;
  bank_name: string;
  bank_account: string;
  account_holder: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string };
}

interface Commission {
  id: number;
  order_amount: string;
  rate: string;
  amount: string;
  status: "pending" | "cancelled";
  available_at: string;
  created_at: string;
  referrer?: { id: number; name: string; email: string };
  referred_user?: { id: number; name: string };
}

type Tab = "products" | "withdrawals" | "commissions";

const STATUS_TABS = [
  { value: "pending", label: "Chờ chi trả" },
  { value: "approved", label: "Đã chi trả" },
  { value: "rejected", label: "Từ chối" },
  { value: "", label: "Tất cả" },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ chi trả", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  approved: { label: "Đã chi trả", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  rejected: { label: "Từ chối", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const inputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500";

function SettingsCard({ storeId, storeName }: { storeId: number; storeName: string }) {
  const [enabled, setEnabled] = useState(false);
  const [rate, setRate] = useState("2");
  const [holdDays, setHoldDays] = useState("7");
  const [minWithdrawal, setMinWithdrawal] = useState("50000");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStoreAffiliateSettings(storeId)
      .then((s) => {
        setEnabled(s.enabled);
        setRate(String(s.rate));
        setHoldDays(String(s.hold_days));
        setMinWithdrawal(String(s.min_withdrawal));
      })
      .catch(() => notifyError("Không tải được cấu hình affiliate"));
  }, [storeId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveStoreAffiliateSettings(storeId, {
        enabled,
        rate: Number(rate),
        hold_days: Number(holdDays),
        min_withdrawal: Number(minWithdrawal),
      });
      notifySuccess(res?.message ?? "Đã lưu");
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-sans text-base font-semibold text-gray-100">Chương trình affiliate của {storeName}</h3>
          <p className="mt-1 text-xs text-gray-500">
            Bạn chọn sản phẩm nào chạy affiliate và hoa hồng bao nhiêu % cho từng sản phẩm (tab "Sản phẩm affiliate").
            Khách lấy link sản phẩm gửi cho người khác; đơn đặt qua link đó hoàn thành thì hoa hồng vào ví người giới thiệu,
            do BẠN chi trả qua MoMo khi họ yêu cầu rút.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
          Bật affiliate
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-xs text-gray-400">
          Hoa hồng mặc định (%) — gợi ý khi bật nhanh sản phẩm
          <input type="number" step="0.1" min={0} max={50} required value={rate} onChange={(e) => setRate(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-xs text-gray-400">
          Số ngày đối soát trước khi rút
          <input type="number" min={0} max={90} required value={holdDays} onChange={(e) => setHoldDays(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-xs text-gray-400">
          Số tiền rút tối thiểu (đ)
          <input type="number" min={0} required value={minWithdrawal} onChange={(e) => setMinWithdrawal(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        Lưu cấu hình
      </button>
      <p className="mt-2 text-xs text-gray-500">Tỷ lệ của từng sản phẩm được chốt vào đơn lúc khách đặt hàng; đổi sau không ảnh hưởng đơn đã đặt.</p>
    </form>
  );
}

function ProductsTab({ storeId }: { storeId: number }) {
  const [items, setItems] = useState<StoreAffiliateProduct[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [rate, setRate] = useState("5");
  const [busy, setBusy] = useState(false);

  const load = () => {
    getStoreAffiliateProducts(storeId, { search: search || undefined, page })
      .then((res) => {
        setItems(res.data);
        setMeta(res.meta);
      })
      .catch(() => notifyError("Không tải được sản phẩm"));
  };

  useEffect(load, [storeId, search, page]);

  const apply = async (ids: number[], enabled: boolean) => {
    if (ids.length === 0) return;
    if (enabled && !(Number(rate) > 0)) {
      notifyError("Nhập hoa hồng lớn hơn 0%");
      return;
    }
    setBusy(true);
    try {
      const res = await updateStoreAffiliateProducts(storeId, { product_ids: ids, enabled, rate: enabled ? Number(rate) : null });
      notifySuccess(res?.message ?? "Đã cập nhật");
      setSelected([]);
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Cập nhật thất bại");
    } finally {
      setBusy(false);
    }
  };

  const allSelected = items.length > 0 && items.every((p) => selected.includes(p.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(keyword.trim());
          }}
          className="flex gap-2"
        >
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm sản phẩm..." className={inputClass} />
          <button className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700">Tìm</button>
        </form>
        <label className="text-xs text-gray-400">
          Hoa hồng (%)
          <input type="number" step="0.1" min={0.1} max={50} value={rate} onChange={(e) => setRate(e.target.value)} className={`${inputClass} mt-1 w-28`} />
        </label>
        <button
          disabled={busy || selected.length === 0}
          onClick={() => apply(selected, true)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Bật affiliate cho {selected.length} sản phẩm đã chọn
        </button>
        <button
          disabled={busy || selected.length === 0}
          onClick={() => apply(selected, false)}
          className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50"
        >
          Tắt
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900 text-xs uppercase text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? items.map((p) => p.id) : [])} />
              </th>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Affiliate</th>
              <th className="px-4 py-3">Hoa hồng / sản phẩm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Không có sản phẩm nào.
                </td>
              </tr>
            )}
            {items.map((p) => {
              const price = p.price * (1 - p.discount_percent / 100);
              return (
                <tr key={p.id} className="text-gray-300">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.thumbnail && <img src={p.thumbnail} alt="" className="size-10 rounded object-cover" />}
                      <span className="line-clamp-2 max-w-xs">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatMoneyVietNam(price)}</td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busy}
                      onClick={() => apply([p.id], !p.affiliate_enabled)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        p.affiliate_enabled
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-gray-700 bg-gray-800 text-gray-400"
                      }`}
                    >
                      {p.affiliate_enabled ? "Đang bật" : "Tắt"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {p.affiliate_rate !== null ? (
                      <span className="font-semibold text-gray-100">
                        {p.affiliate_rate}%{" "}
                        <span className="text-xs font-normal text-gray-500">≈ {formatMoneyVietNam((price * p.affiliate_rate) / 100)}</span>
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg bg-gray-800 px-3 py-1.5 disabled:opacity-40">
            Trước
          </button>
          <span>
            {meta.current_page}/{meta.last_page}
          </span>
          <button disabled={page >= meta.last_page} onClick={() => setPage(page + 1)} className="rounded-lg bg-gray-800 px-3 py-1.5 disabled:opacity-40">
            Sau
          </button>
        </div>
      )}
    </div>
  );
}

function WithdrawalsTab({ storeId }: { storeId: number }) {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [status, setStatus] = useState("pending");

  const load = () => {
    getStoreAffiliateWithdrawals(storeId, status || undefined)
      .then((res) => setItems(res?.data?.data ?? []))
      .catch(() => notifyError("Không tải được yêu cầu rút tiền"));
  };

  useEffect(load, [storeId, status]);

  const payMomo = async (w: Withdrawal) => {
    if (!window.confirm(`Chi trả ${formatMoneyVietNam(Number(w.amount))} cho ${w.user?.name} qua cổng MoMo sandbox?`)) return;
    try {
      window.location.href = await payStoreAffiliateWithdrawal(storeId, w.id);
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Không tạo được thanh toán MoMo");
    }
  };

  const review = async (w: Withdrawal, next: "approved" | "rejected") => {
    let note: string | undefined;
    if (next === "rejected") {
      note = window.prompt("Lý do từ chối (người dùng sẽ thấy):") ?? undefined;
      if (note === undefined) return;
    } else if (!window.confirm(`Xác nhận bạn đã tự chuyển ${formatMoneyVietNam(Number(w.amount))} cho ${w.user?.name}?`)) {
      return;
    }

    try {
      const res = await reviewStoreAffiliateWithdrawal(storeId, w.id, next, note);
      notifySuccess(res?.message ?? "Đã xử lý");
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Xử lý thất bại");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              status === t.value ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Không có yêu cầu nào.</p>}

      {items.map((w) => (
        <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div>
            <p className="text-sm font-semibold text-gray-100">
              {w.user?.name} <span className="text-xs font-normal text-gray-500">· {w.user?.email}</span>
            </p>
            <p className="text-xs text-gray-400">
              {w.bank_name} · {w.account_holder} · {w.bank_account}
            </p>
            {w.note && <p className="text-xs text-gray-500">Ghi chú: {w.note}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-base font-bold text-gray-100">{formatMoneyVietNam(Number(w.amount))}</p>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_META[w.status].className}`}>
                {STATUS_META[w.status].label}
              </span>
            </div>
            {w.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => payMomo(w)} className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-500">
                  Chi trả qua MoMo
                </button>
                <button onClick={() => review(w, "approved")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                  Đã chuyển tay
                </button>
                <button onClick={() => review(w, "rejected")} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500">
                  Từ chối
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommissionsTab({ storeId }: { storeId: number }) {
  const [items, setItems] = useState<Commission[]>([]);

  useEffect(() => {
    getStoreAffiliateCommissions(storeId)
      .then((res) => setItems(res?.data?.data ?? []))
      .catch(() => notifyError("Không tải được hoa hồng"));
  }, [storeId]);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-900 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Người giới thiệu</th>
            <th className="px-4 py-3">Khách mua</th>
            <th className="px-4 py-3">Giá trị hàng</th>
            <th className="px-4 py-3">Hoa hồng</th>
            <th className="px-4 py-3">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                Chưa phát sinh hoa hồng nào.
              </td>
            </tr>
          )}
          {items.map((c) => (
            <tr key={c.id} className="text-gray-300">
              <td className="px-4 py-3">{c.referrer?.name}</td>
              <td className="px-4 py-3">{c.referred_user?.name}</td>
              <td className="px-4 py-3">{formatMoneyVietNam(Number(c.order_amount))}</td>
              <td className="px-4 py-3 font-semibold text-gray-100">
                {formatMoneyVietNam(Number(c.amount))} <span className="text-xs text-gray-500">({Number(c.rate)}%)</span>
              </td>
              <td className="px-4 py-3 text-xs">
                {c.status === "cancelled" ? (
                  <span className="text-gray-500">Đã hủy (đơn hoàn trả)</span>
                ) : new Date(c.available_at) > new Date() ? (
                  <span className="text-amber-400">Rút được từ {new Date(c.available_at).toLocaleDateString("vi-VN")}</span>
                ) : (
                  <span className="text-emerald-400">Có thể rút</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS: { value: Tab; label: string }[] = [
  { value: "products", label: "Sản phẩm affiliate" },
  { value: "withdrawals", label: "Yêu cầu rút tiền" },
  { value: "commissions", label: "Hoa hồng đã ghi nhận" },
];

export default function SellerAffiliate() {
  const { activeStore } = useAuth();
  const [tab, setTab] = useState<Tab>("products");

  useEffect(() => {
    const payout = new URLSearchParams(window.location.search).get("payout");
    if (!payout) return;

    if (payout === "success") {
      notifySuccess("Đã chi trả hoa hồng qua MoMo sandbox");
    } else {
      notifyError("Thanh toán MoMo thất bại hoặc bị huỷ — yêu cầu vẫn ở trạng thái chờ chi trả");
    }
    setTab("withdrawals");
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  if (!activeStore) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="font-sans text-2xl font-bold text-white">Affiliate</h2>
        <p className="text-sm text-gray-400">Bạn cần tạo/chọn 1 gian hàng trước.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">Affiliate</h2>

      <SettingsCard storeId={activeStore.id} storeName={activeStore.name} />

      <div className="flex gap-2 overflow-x-auto border-b border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.value ? "border-indigo-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" ? (
        <ProductsTab key={activeStore.id} storeId={activeStore.id} />
      ) : tab === "withdrawals" ? (
        <WithdrawalsTab key={activeStore.id} storeId={activeStore.id} />
      ) : (
        <CommissionsTab key={activeStore.id} storeId={activeStore.id} />
      )}

      <ToastContainer />
    </div>
  );
}
