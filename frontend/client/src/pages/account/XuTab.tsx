import { useEffect, useState } from "react";
import { CalendarCheck, Coins, Flame, Loader2 } from "lucide-react";
import { type ApiError } from "../../libs/api";
import {
  checkInXu,
  getXuSummary,
  getXuTransactions,
  type XuSummary,
  type XuTransaction,
} from "../../services/xu";

const formatXu = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

function XuTab() {
  const [summary, setSummary] = useState<XuSummary | null>(null);
  const [history, setHistory] = useState<XuTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    Promise.all([getXuSummary(), getXuTransactions()])
      .then(([s, h]) => {
        setSummary(s);
        setHistory(h);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCheckIn = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const res = await checkInXu();
      setSummary(res.summary);
      setMessage({ ok: true, text: res.message });
      setHistory(await getXuTransactions());
    } catch (err) {
      setMessage({ ok: false, text: (err as ApiError)?.message ?? "Điểm danh thất bại" });
    } finally {
      setChecking(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const cycle = summary.rules.checkin_streak_cycle;
  const dayInCycle = summary.streak === 0 ? 0 : ((summary.streak - 1) % cycle) + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Coins className="size-6" />
            </div>
            <div>
              <p className="font-sans text-[13px] text-gray-500">Số dư ShopTech Xu</p>
              <p className="font-sans text-[26px] font-bold text-amber-600">{formatXu(summary.balance)} xu</p>
            </div>
          </div>
          <p className="max-w-[220px] text-right font-sans text-[12px] text-gray-500">
            1 xu = 1đ. Dùng tối đa {summary.rules.max_redeem_percent}% giá trị đơn khi thanh toán.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-sans text-[15px] font-bold text-gray-800">
            <CalendarCheck className="size-5 text-primary500" /> Điểm danh mỗi ngày
          </h3>
          <span className="flex items-center gap-1 font-sans text-[13px] font-semibold text-orange-500">
            <Flame className="size-4" /> Chuỗi {summary.streak} ngày
          </span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: cycle }, (_, i) => {
            const done = i < dayInCycle;
            const isBonus = i === cycle - 1;
            const reward = isBonus
              ? summary.rules.checkin_base + summary.rules.checkin_streak_bonus
              : summary.rules.checkin_base;
            return (
              <div
                key={i}
                className={`flex flex-col items-center rounded-xl border px-1 py-2 font-sans text-[11px] sm:text-[12px] ${
                  done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : isBonus
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-gray-100 bg-gray-50 text-gray-500"
                }`}
              >
                <span>Ngày {i + 1}</span>
                <span className="mt-0.5 font-bold">+{reward}</span>
                {done && <span>✓</span>}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleCheckIn}
          disabled={checking || summary.checked_in_today}
          className="mt-4 w-full rounded-xl bg-primary500 py-2.5 font-sans text-[14px] font-bold text-white transition-colors hover:bg-primary500/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {summary.checked_in_today
            ? "Hôm nay bạn đã điểm danh ✓"
            : checking
              ? "Đang điểm danh..."
              : `Điểm danh nhận ${summary.next_reward} xu`}
        </button>
        {message && (
          <p className={`mt-2 font-sans text-[13px] ${message.ok ? "text-emerald-600" : "text-rose-600"}`}>
            {message.text}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="font-sans text-[15px] font-bold text-gray-800">Cách kiếm xu</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-[13px] text-gray-600">
          <li>Hoàn thành đơn hàng: nhận {summary.rules.earn_percent_of_order}% số tiền đã thanh toán.</li>
          <li>
            Đánh giá sản phẩm đã mua: +{summary.rules.review_text_only} xu, kèm ảnh +
            {summary.rules.review_with_photo} xu.
          </li>
          <li>
            Điểm danh liên tục {cycle} ngày: thưởng thêm {summary.rules.checkin_streak_bonus} xu.
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="font-sans text-[15px] font-bold text-gray-800">Lịch sử xu</h3>
        {history.length === 0 ? (
          <p className="mt-3 font-sans text-[13px] text-gray-400">Chưa có giao dịch xu nào.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {history.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-sans text-[13px] font-semibold text-gray-700">
                    {t.description ?? t.type}
                  </p>
                  <p className="font-sans text-[11px] text-gray-400">
                    {new Date(t.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-sans text-[14px] font-bold ${
                    t.amount >= 0 ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {formatXu(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default XuTab;
