import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GitCompareArrows, Loader2, Sparkles, Trophy, Wallet } from "lucide-react";
import { formatPrice } from "../libs/format";
import {
  getCompareVerdict,
  getComparison,
  type CompareResult,
  type CompareVerdict,
} from "../services/compare";
import { useCompare } from "../context/CompareContext";

function ComparePage() {
  const [params] = useSearchParams();
  const { clear } = useCompare();
  const ids = useMemo(
    () =>
      (params.get("ids") ?? "")
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 3),
    [params],
  );

  const [data, setData] = useState<CompareResult | null>(null);
  const [verdict, setVerdict] = useState<CompareVerdict | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyDiff, setOnlyDiff] = useState(false);

  const idsKey = ids.join(",");

  useEffect(() => {
    if (ids.length < 2) {
      setError("Hãy chọn ít nhất 2 sản phẩm để so sánh.");
      setLoading(false);
      return;
    }

    let ignore = false;
    setLoading(true);
    setError(null);
    setVerdict(null);

    getComparison(ids)
      .then((res) => {
        if (ignore) return;
        setData(res);
        if (res.products.length >= 2) {
          getCompareVerdict(ids)
            .then((v) => !ignore && setVerdict(v))
            .catch(() => !ignore && setVerdict(null));
        }
      })
      .catch(() => !ignore && setError("Không tải được dữ liệu so sánh."))
      .finally(() => !ignore && setLoading(false));

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary500" />
      </div>
    );
  }

  if (error || !data || data.products.length < 2) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[600px] flex-col items-center justify-center gap-4 px-4 text-center">
        <GitCompareArrows className="size-12 text-gray-300" />
        <p className="font-sans text-[15px] text-gray-500">{error ?? "Không đủ sản phẩm hợp lệ để so sánh."}</p>
        <Link to="/" className="rounded-full border border-primary500 px-6 py-2 font-sans text-[14px] font-semibold text-primary500">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const { products, rows, highlights } = data;
  const visibleRows = onlyDiff
    ? rows.filter((r) => new Set(r.values.map((v) => v ?? "—")).size > 1)
    : rows;
  const cols = `minmax(120px,160px) repeat(${products.length}, minmax(160px, 1fr))`;

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-5 px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-sans text-[20px] font-bold text-gray-900">
          <GitCompareArrows className="size-6 text-primary500" /> So sánh sản phẩm
        </h1>
        <button type="button" onClick={clear} className="font-sans text-[13px] text-gray-500 hover:text-primary500">
          Xóa danh sách so sánh
        </button>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-4 shadow-sm">
        <p className="flex items-center gap-2 font-sans text-[14px] font-bold text-violet-700">
          <Sparkles className="size-4" /> Nhận định của trợ lý AI
        </p>
        {verdict ? (
          <p className="mt-2 whitespace-pre-line font-sans text-[13px] leading-relaxed text-gray-700">{verdict.text}</p>
        ) : (
          <p className="mt-2 flex items-center gap-2 font-sans text-[13px] text-gray-400">
            <Loader2 className="size-4 animate-spin" /> Đang phân tích...
          </p>
        )}
        {verdict?.source === "basic" && (
          <p className="mt-2 font-sans text-[11px] text-gray-400">Tóm tắt tự động (trợ lý AI tạm thời chưa khả dụng).</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="min-w-[640px]">
          <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: cols }}>
            <div className="p-3" />
            {products.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-2 p-3 text-center">
                <div className="flex min-h-6 flex-wrap justify-center gap-1">
                  {highlights.cheapest === p.id && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-sans text-[11px] font-semibold text-emerald-600">
                      <Wallet className="size-3" /> Giá tốt nhất
                    </span>
                  )}
                  {highlights.best_rated === p.id && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-sans text-[11px] font-semibold text-amber-600">
                      <Trophy className="size-3" /> Đánh giá cao nhất
                    </span>
                  )}
                </div>
                <Link to={`/san-pham/${p.slug}`}>
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} className="size-28 object-contain" />
                  ) : (
                    <div className="size-28 rounded-xl bg-gray-50" />
                  )}
                </Link>
                <Link to={`/san-pham/${p.slug}`} className="line-clamp-2 font-sans text-[14px] font-bold text-gray-800 hover:text-primary500">
                  {p.name}
                </Link>
                <p className="font-sans text-[16px] font-bold text-primary500">{formatPrice(p.final_price)}</p>
                {p.discount_percent > 0 && (
                  <p className="font-sans text-[12px] text-gray-400 line-through">{formatPrice(p.price)}</p>
                )}
                <p className="font-sans text-[12px] text-gray-500">
                  ★ {p.reviews_count > 0 ? `${p.rating.toFixed(1)} (${p.reviews_count})` : "Chưa có đánh giá"}
                </p>
                <p className={`font-sans text-[12px] font-medium ${p.in_stock ? "text-emerald-600" : "text-rose-500"}`}>
                  {p.in_stock ? "Còn hàng" : "Tạm hết hàng"}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
            <span className="font-sans text-[13px] font-semibold text-gray-700">Thông số kỹ thuật</span>
            <label className="flex cursor-pointer items-center gap-2 font-sans text-[12px] text-gray-600">
              <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
              Chỉ hiện điểm khác biệt
            </label>
          </div>

          {visibleRows.length === 0 ? (
            <p className="p-6 text-center font-sans text-[13px] text-gray-400">
              {rows.length === 0 ? "Chưa có thông số kỹ thuật để so sánh." : "Các sản phẩm có thông số giống nhau."}
            </p>
          ) : (
            visibleRows.map((row, index) => (
              <div
                key={row.name}
                className={`grid ${index % 2 === 1 ? "bg-gray-50/60" : ""}`}
                style={{ gridTemplateColumns: cols }}
              >
                <div className="p-3 font-sans text-[13px] font-semibold text-gray-600">{row.name}</div>
                {row.values.map((value, i) => (
                  <div key={i} className="p-3 text-center font-sans text-[13px] text-gray-800">
                    {value ?? <span className="text-gray-300">—</span>}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ComparePage;
