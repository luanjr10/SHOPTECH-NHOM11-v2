import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera, CheckCircle2, Loader2, Recycle, X } from "lucide-react";
import { formatPrice } from "../libs/format";
import { type ApiError } from "../libs/api";
import { useAuth } from "../context/AuthContext";
import {
  estimateTradeIn,
  getMyTradeInRequests,
  getTradeInCatalog,
  submitTradeIn,
  type TradeInCatalog,
  type TradeInEstimate,
  type TradeInRequestItem,
} from "../services/tradeIn";

const STATUS: Record<string, { label: string; style: string }> = {
  pending: { label: "Chờ duyệt", style: "bg-amber-50 text-amber-600" },
  approved: { label: "Đã duyệt", style: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Từ chối", style: "bg-rose-50 text-rose-600" },
  used: { label: "Đã dùng", style: "bg-gray-100 text-gray-500" },
};

function TradeInPage() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<TradeInCatalog | null>(null);
  const [params] = useSearchParams();
  const [storeId, setStoreId] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [modelId, setModelId] = useState<number | null>(null);
  const [condition, setCondition] = useState("good");
  const [hasBox, setHasBox] = useState(false);
  const [hasCharger, setHasCharger] = useState(false);
  const [estimate, setEstimate] = useState<TradeInEstimate | null>(null);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [requests, setRequests] = useState<TradeInRequestItem[]>([]);

  useEffect(() => {
    getTradeInCatalog()
      .then((c) => {
        setCatalog(c);
        const wanted = Number(params.get("store"));
        const initial = c.stores.find((s) => s.id === wanted) ?? c.stores[0];
        setStoreId(initial?.id ?? null);
      })
      .catch(() => setNotice({ ok: false, text: "Không tải được danh sách máy thu cũ." }));
  }, []);

  const loadRequests = () => {
    if (user) getMyTradeInRequests().then(setRequests).catch(() => undefined);
  };

  useEffect(loadRequests, [user]);

  const storeModels = useMemo(
    () => catalog?.models.filter((m) => m.store_id === storeId) ?? [],
    [catalog, storeId],
  );

  const availableCategories = useMemo(
    () => (catalog ? Object.entries(catalog.categories).filter(([key]) => storeModels.some((m) => m.category === key)) : []),
    [catalog, storeModels],
  );

  useEffect(() => {
    setCategory((current) =>
      availableCategories.some(([key]) => key === current) ? current : (availableCategories[0]?.[0] ?? ""),
    );
  }, [availableCategories]);

  const models = useMemo(() => storeModels.filter((m) => m.category === category), [storeModels, category]);

  useEffect(() => {
    setModelId(models[0]?.id ?? null);
  }, [models]);

  useEffect(() => {
    if (!modelId) {
      setEstimate(null);
      return;
    }
    estimateTradeIn({ trade_in_model_id: modelId, condition, has_box: hasBox, has_charger: hasCharger })
      .then(setEstimate)
      .catch(() => setEstimate(null));
  }, [modelId, condition, hasBox, hasCharger]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !modelId || files.length === 0) {
      setNotice({ ok: false, text: "Vui lòng chọn máy và tải lên ít nhất 1 ảnh thực tế." });
      return;
    }

    const form = new FormData();
    form.append("store_id", String(storeId));
    form.append("trade_in_model_id", String(modelId));
    form.append("condition", condition);
    form.append("has_box", hasBox ? "1" : "0");
    form.append("has_charger", hasCharger ? "1" : "0");
    if (description.trim()) form.append("description", description.trim());
    files.forEach((f) => form.append("images[]", f));

    setSubmitting(true);
    setNotice(null);
    try {
      const res = await submitTradeIn(form);
      setNotice({ ok: true, text: res.message });
      setFiles([]);
      setDescription("");
      loadRequests();
    } catch (err) {
      setNotice({ ok: false, text: (err as ApiError)?.message ?? "Gửi yêu cầu thất bại" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500";

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-3 py-4 sm:px-4">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 p-5 text-white shadow-sm sm:p-7">
        <p className="flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-wide opacity-90">
          <Recycle className="size-4" /> Thu cũ đổi mới
        </p>
        <h1 className="mt-1 font-sans text-[22px] font-bold sm:text-[28px]">Thu cũ giá ngon - Lên đời tiết kiệm</h1>
        <p className="mt-1 max-w-[560px] font-sans text-[13px] opacity-90">
          Chọn gian hàng, định giá máy cũ ngay trong vài giây. Gửi yêu cầu kèm ảnh, gian hàng duyệt và tặng bạn voucher
          trừ thẳng vào đơn mua tại gian hàng đó (hạn {catalog?.credit_valid_days ?? 30} ngày).
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          {catalog && catalog.stores.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 font-sans text-[13px] text-amber-700">
              Hiện chưa có gian hàng nào nhận thu cũ. Vui lòng quay lại sau.
            </p>
          )}

          <label className="font-sans text-[13px] font-semibold text-gray-600">
            Gian hàng thu mua
            <select
              className={`${selectClass} mt-1`}
              value={storeId ?? ""}
              onChange={(e) => setStoreId(Number(e.target.value))}
            >
              {catalog?.stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block font-sans text-[12px] font-normal text-gray-400">
              Gian hàng bạn chọn sẽ định giá, duyệt máy cũ và tặng voucher dùng để mua hàng tại chính gian hàng đó.
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="font-sans text-[13px] font-semibold text-gray-600">
              Loại thiết bị
              <select className={`${selectClass} mt-1`} value={category} onChange={(e) => setCategory(e.target.value)}>
                {availableCategories.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-sans text-[13px] font-semibold text-gray-600">
              Dòng máy
              <select
                className={`${selectClass} mt-1`}
                value={modelId ?? ""}
                onChange={(e) => setModelId(Number(e.target.value))}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brand} {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="font-sans text-[13px] font-semibold text-gray-600">Tình trạng máy</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {catalog?.conditions.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCondition(c.key)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    condition === c.key ? "border-emerald-500 bg-emerald-50" : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <span className="block font-sans text-[14px] font-bold text-gray-800">{c.label}</span>
                  <span className="block font-sans text-[12px] text-gray-500">{c.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 font-sans text-[13px] text-gray-700">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={hasBox} onChange={(e) => setHasBox(e.target.checked)} /> Còn hộp máy
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={hasCharger} onChange={(e) => setHasCharger(e.target.checked)} /> Còn sạc
              chính hãng
            </label>
          </div>

          <div>
            <p className="font-sans text-[13px] font-semibold text-gray-600">Ảnh thực tế (1–4 ảnh)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative">
                  <img src={src} alt="" className="size-20 rounded-lg border border-gray-200 object-cover" />
                  <button
                    type="button"
                    aria-label="Bỏ ảnh"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gray-800 text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {files.length < 4 && (
                <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-emerald-400 hover:text-emerald-500">
                  <Camera className="size-5" />
                  <span className="font-sans text-[10px]">Thêm ảnh</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []);
                      setFiles((prev) => [...prev, ...picked].slice(0, 4));
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Mô tả thêm (dung lượng, lỗi nếu có, lịch sử sửa chữa...)"
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 font-sans text-[13px] outline-none focus:border-primary500"
          />

          {notice && (
            <p className={`rounded-lg px-3 py-2 font-sans text-[13px] ${notice.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
              {notice.text}
            </p>
          )}

          {user ? (
            <button
              type="submit"
              disabled={submitting || !estimate}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-sans text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Gửi yêu cầu thu cũ
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-xl bg-emerald-600 py-3 text-center font-sans text-[14px] font-bold text-white hover:bg-emerald-700"
            >
              Đăng nhập để gửi yêu cầu
            </Link>
          )}
        </form>

        <aside className="h-fit rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm sm:p-5">
          <p className="font-sans text-[13px] font-semibold text-emerald-700">Giá thu ước tính</p>
          {estimate ? (
            <>
              <p className="mt-1 font-sans text-[30px] font-bold text-emerald-700">{formatPrice(estimate.estimated_price)}</p>
              <ul className="mt-3 space-y-1.5 font-sans text-[12px] text-gray-600">
                <li className="flex justify-between">
                  <span>Giá gốc {estimate.model}</span>
                  <span>{formatPrice(estimate.base_price)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Tình trạng {estimate.condition_label}</span>
                  <span>× {Math.round(estimate.multiplier * 100)}%</span>
                </li>
                {estimate.box_bonus > 0 && (
                  <li className="flex justify-between">
                    <span>Còn hộp</span>
                    <span>+{formatPrice(estimate.box_bonus)}</span>
                  </li>
                )}
                {estimate.charger_bonus > 0 && (
                  <li className="flex justify-between">
                    <span>Còn sạc</span>
                    <span>+{formatPrice(estimate.charger_bonus)}</span>
                  </li>
                )}
              </ul>
              <p className="mt-3 font-sans text-[11px] text-gray-500">
                Giá chính thức do gian hàng chốt sau khi xem ảnh. Voucher chỉ dùng cho sản phẩm của gian hàng đó, đơn từ cùng giá trị.
              </p>
            </>
          ) : (
            <p className="mt-2 font-sans text-[13px] text-gray-400">Chọn dòng máy để xem giá.</p>
          )}
        </aside>
      </div>

      {user && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-sans text-[15px] font-bold text-gray-800">Yêu cầu của tôi</h2>
          {requests.length === 0 ? (
            <p className="mt-3 font-sans text-[13px] text-gray-400">Bạn chưa gửi yêu cầu thu cũ nào.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-sans text-[14px] font-semibold text-gray-800">
                      {r.model_name}
                      {r.store && <span className="ml-2 font-normal text-gray-400">· {r.store.name}</span>}
                    </p>
                    <p className="font-sans text-[12px] text-gray-500">
                      Ước tính {formatPrice(Number(r.estimated_price))}
                      {r.final_price && ` · Chốt ${formatPrice(Number(r.final_price))}`}
                    </p>
                    {r.status === "approved" && r.coupon_code && (
                      <p className="mt-1 flex items-center gap-1.5 font-sans text-[12px] font-semibold text-emerald-600">
                        <CheckCircle2 className="size-4" /> Mã voucher:{" "}
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono">{r.coupon_code}</span>
                        — dùng ở bước thanh toán
                      </p>
                    )}
                    {r.admin_note && <p className="font-sans text-[12px] text-gray-400">Ghi chú: {r.admin_note}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${STATUS[r.status].style}`}>
                    {STATUS[r.status].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default TradeInPage;
