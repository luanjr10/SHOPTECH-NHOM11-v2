import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import {
  createStoreTradeInModel,
  deleteStoreTradeInModel,
  getStoreTradeInModels,
  getStoreTradeInRequests,
  reviewStoreTradeInRequest,
  updateStoreTradeInModel,
  type TradeInModelPayload,
} from "../../services/seller.services";

interface TradeInRequest {
  id: number;
  model_name: string;
  condition: string;
  has_box: boolean;
  has_charger: boolean;
  description: string | null;
  images: string[] | null;
  estimated_price: string;
  final_price: string | null;
  status: "pending" | "approved" | "rejected" | "used";
  admin_note: string | null;
  coupon_code: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string; phone: string | null };
}

interface TradeInModel extends TradeInModelPayload {
  id: number;
}

const CONDITION_LABEL: Record<string, string> = {
  like_new: "Như mới",
  good: "Tốt",
  fair: "Khá",
  poor: "Cũ",
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ duyệt", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  approved: { label: "Đã duyệt", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  rejected: { label: "Từ chối", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  used: { label: "Khách đã dùng voucher", className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
};

const STATUS_TABS = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
  { value: "", label: "Tất cả" },
];

const inputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500";

const emptyModel: TradeInModelPayload = { category: "phone", brand: "", name: "", base_price: 0, is_active: true };

function RequestsTab({ storeId }: { storeId: number }) {
  const [items, setItems] = useState<TradeInRequest[]>([]);
  const [status, setStatus] = useState("pending");
  const [prices, setPrices] = useState<Record<number, string>>({});

  const load = () => {
    getStoreTradeInRequests(storeId, status || undefined)
      .then((res) => setItems(res?.data?.data ?? []))
      .catch(() => notifyError("Không tải được yêu cầu thu cũ"));
  };

  useEffect(load, [storeId, status]);

  const review = async (item: TradeInRequest, next: "approved" | "rejected") => {
    let note: string | undefined;
    if (next === "rejected") {
      note = window.prompt("Lý do từ chối (khách sẽ thấy):") ?? undefined;
      if (note === undefined) return;
    } else {
      const final = prices[item.id] ? Number(prices[item.id]) : Number(item.estimated_price);
      const ok = window.confirm(
        `Duyệt thu "${item.model_name}" với giá ${formatMoneyVietNam(final)}?\n` +
          "Khoản này sẽ được TRỪ VÀO TIỀN BẠN NHẬN khi khách dùng voucher mua hàng tại gian hàng của bạn.",
      );
      if (!ok) return;
    }

    try {
      const res = await reviewStoreTradeInRequest(storeId, item.id, {
        status: next,
        final_price: next === "approved" && prices[item.id] ? Number(prices[item.id]) : undefined,
        note,
      });
      notifySuccess(res?.message ?? "Đã xử lý");
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Xử lý thất bại");
    }
  };

  return (
    <div className="flex flex-col gap-4">
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

      {items.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Không có yêu cầu nào.</p>}

      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-gray-100">{item.model_name}</p>
              <p className="text-xs text-gray-400">
                {item.user?.name} · {item.user?.email}
                {item.user?.phone ? ` · ${item.user.phone}` : ""}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Tình trạng khách khai: <b className="text-gray-200">{CONDITION_LABEL[item.condition] ?? item.condition}</b>
                {item.has_box && " · Còn hộp"}
                {item.has_charger && " · Còn sạc"}
              </p>
              {item.description && <p className="mt-1 text-xs text-gray-300">“{item.description}”</p>}
            </div>
            <div className="text-right">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_META[item.status].className}`}
              >
                {STATUS_META[item.status].label}
              </span>
              <p className="mt-2 text-xs text-gray-500">Giá ước tính theo bảng giá của bạn</p>
              <p className="text-lg font-bold text-gray-100">{formatMoneyVietNam(Number(item.estimated_price))}</p>
              {item.final_price && (
                <p className="text-xs text-emerald-400">Chốt {formatMoneyVietNam(Number(item.final_price))}</p>
              )}
            </div>
          </div>

          {item.images && item.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.images.map((src) => (
                <a key={src} href={src} target="_blank" rel="noreferrer">
                  <img src={src} alt="" className="h-20 w-20 rounded-lg border border-gray-700 object-cover" />
                </a>
              ))}
            </div>
          )}

          {item.coupon_code && (
            <p className="mt-3 text-xs text-gray-400">
              Voucher đã cấp:{" "}
              <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-gray-200">{item.coupon_code}</span>
            </p>
          )}
          {item.admin_note && <p className="mt-1 text-xs text-gray-500">Ghi chú: {item.admin_note}</p>}

          {item.status === "pending" && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-800 pt-3">
              <input
                type="number"
                min={1}
                placeholder={`Giá chốt (mặc định ${Number(item.estimated_price)})`}
                value={prices[item.id] ?? ""}
                onChange={(e) => setPrices({ ...prices, [item.id]: e.target.value })}
                className={`${inputClass} max-w-[260px]`}
              />
              <button
                onClick={() => review(item, "approved")}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Duyệt & cấp voucher
              </button>
              <button
                onClick={() => review(item, "rejected")}
                className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Từ chối
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PriceTableTab({ storeId }: { storeId: number }) {
  const [models, setModels] = useState<TradeInModel[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [form, setForm] = useState<TradeInModelPayload>(emptyModel);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () => {
    getStoreTradeInModels(storeId)
      .then((res) => {
        setModels(res?.data ?? []);
        setCategories(res?.categories ?? {});
      })
      .catch(() => notifyError("Không tải được bảng giá thu cũ"));
  };

  useEffect(load, [storeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateStoreTradeInModel(storeId, editingId, form);
        notifySuccess("Đã cập nhật dòng máy");
      } else {
        await createStoreTradeInModel(storeId, form);
        notifySuccess("Đã thêm dòng máy");
      }
      setForm(emptyModel);
      setEditingId(null);
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Lưu thất bại");
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Xoá dòng máy này khỏi bảng giá thu cũ?")) return;
    try {
      await deleteStoreTradeInModel(storeId, id);
      load();
    } catch {
      notifyError("Xoá thất bại");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4 sm:grid-cols-5">
        <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {Object.entries(categories).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <input
          required
          placeholder="Hãng (Apple...)"
          className={inputClass}
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
        />
        <input
          required
          placeholder="Tên dòng máy"
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          type="text"
          inputMode="numeric"
          placeholder="Giá thu gốc (đ)"
          className={inputClass}
          value={form.base_price ? form.base_price.toLocaleString("vi-VN") : ""}
          onChange={(e) => setForm({ ...form, base_price: Number(e.target.value.replace(/\D/g, "")) })}
        />
        <div className="flex items-center gap-2">
          <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            {editingId ? "Cập nhật" : "Thêm"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyModel);
              }}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              Huỷ
            </button>
          )}
        </div>
      </form>

      <p className="text-xs text-gray-500">
        Giá thu gốc là giá bạn sẵn sàng trả cho máy "Như mới". Hệ thống tự nhân hệ số theo tình trạng (Tốt 85%, Khá 65%, Cũ
        40%) và cộng thêm 2% nếu còn hộp, 1% nếu còn sạc. Khách chỉ thấy gian hàng của bạn khi có ít nhất một dòng máy đang thu.
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Dòng máy</th>
              <th className="px-4 py-3">Giá thu gốc</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {models.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Chưa có dòng máy nào. Thêm dòng máy đầu tiên để bắt đầu nhận thu cũ.
                </td>
              </tr>
            )}
            {models.map((m) => (
              <tr key={m.id} className="text-gray-300">
                <td className="px-4 py-3">{categories[m.category] ?? m.category}</td>
                <td className="px-4 py-3">
                  {m.brand} {m.name}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-100">{formatMoneyVietNam(Number(m.base_price))}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={async () => {
                      await updateStoreTradeInModel(storeId, m.id, { ...m, is_active: !m.is_active });
                      load();
                    }}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      m.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {m.is_active ? "Đang thu" : "Tạm ngưng"}
                  </button>
                </td>
                <td className="space-x-3 px-4 py-3 text-right text-xs">
                  <button
                    onClick={() => {
                      setEditingId(m.id);
                      setForm({
                        category: m.category,
                        brand: m.brand,
                        name: m.name,
                        base_price: Number(m.base_price),
                        is_active: m.is_active,
                      });
                    }}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    Sửa
                  </button>
                  <button onClick={() => remove(m.id)} className="text-rose-400 hover:text-rose-300">
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SellerTradeIn() {
  const { activeStore } = useAuth();
  const [tab, setTab] = useState<"requests" | "prices">("requests");

  if (!activeStore) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="font-sans text-2xl font-bold text-white">Thu cũ đổi mới</h2>
        <p className="text-sm text-gray-400">Bạn cần tạo/chọn 1 gian hàng trước.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div>
        <h2 className="font-sans text-2xl font-bold text-white">Thu cũ đổi mới</h2>
        <p className="mt-1 text-sm text-gray-400">
          Gian hàng {activeStore.name} tự định giá thu máy cũ và duyệt yêu cầu. Voucher chỉ dùng được cho sản phẩm của gian
          hàng bạn, và khoản trừ do gian hàng chịu.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-800">
        {[
          { value: "requests", label: "Yêu cầu thu cũ" },
          { value: "prices", label: "Bảng giá thu" },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as "requests" | "prices")}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.value ? "border-indigo-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "requests" ? (
        <RequestsTab key={activeStore.id} storeId={activeStore.id} />
      ) : (
        <PriceTableTab key={activeStore.id} storeId={activeStore.id} />
      )}

      <ToastContainer />
    </div>
  );
}
