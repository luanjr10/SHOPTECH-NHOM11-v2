import { useEffect, useState } from "react";
import { BadgeCheck, Gem, Loader2, Ticket, Truck } from "lucide-react";
import { formatPrice } from "../../libs/format";
import { claimVoucher, getLoyaltySummary, getMyVouchers } from "../../services/loyalty";
import type { LoyaltySummary, MyVoucher } from "../../types/loyalty";
import { type ApiError } from "../../libs/api";

const TIER_STYLE: Record<string, string> = {
  dong: "bg-amber-100 text-amber-700",
  bac: "bg-slate-200 text-slate-700",
  vang: "bg-yellow-100 text-yellow-700",
  kim_cuong: "bg-cyan-100 text-cyan-700",
};

function VoucherCard({
  voucher,
  onClaim,
  claiming,
}: {
  voucher: MyVoucher;
  onClaim: (id: number) => void;
  claiming: boolean;
}) {
  const soldOut = voucher.remaining_for_me !== null && voucher.remaining_for_me <= 0;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary500/10 text-primary500">
        {voucher.is_free_ship ? <Truck className="size-6" /> : <Ticket className="size-6" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[14px] font-semibold text-gray-800">
          {voucher.title ?? voucher.code}
        </p>
        <p className="mt-0.5 line-clamp-2 font-sans text-[12px] text-gray-500">
          {voucher.description ?? `Áp dụng cho đơn từ ${formatPrice(voucher.min_order_amount)}`}
        </p>
        <p className="mt-1 font-sans text-[11px] text-gray-400">
          Dành cho hạng {voucher.target_tier_label}
          {voucher.per_user_limit ? ` · Tối đa ${voucher.per_user_limit} lượt/khách` : ""}
          {voucher.claimed && voucher.remaining_for_me !== null
            ? ` · Còn ${voucher.remaining_for_me} lượt`
            : ""}
        </p>
      </div>
      <div className="shrink-0">
        {voucher.claimed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 font-sans text-[12px] font-semibold text-emerald-600">
            <BadgeCheck className="size-4" /> Đã nhận
          </span>
        ) : (
          <button
            type="button"
            disabled={claiming || soldOut}
            onClick={() => onClaim(voucher.id)}
            className="rounded-full bg-primary500 px-4 py-1.5 font-sans text-[12px] font-semibold text-white transition-colors hover:bg-primary500/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {claiming ? <Loader2 className="size-4 animate-spin" /> : "Nhận"}
          </button>
        )}
      </div>
    </div>
  );
}

function VouchersTab() {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [vouchers, setVouchers] = useState<MyVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    Promise.all([getLoyaltySummary(), getMyVouchers()])
      .then(([s, v]) => {
        setSummary(s);
        setVouchers(v);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleClaim = async (id: number) => {
    setClaimingId(id);
    setMessage(null);
    try {
      const res = await claimVoucher(id);
      setMessage(res.message);
      load();
    } catch (err) {
      setMessage((err as ApiError)?.message ?? "Nhận voucher thất bại.");
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-12 items-center justify-center rounded-full ${
                TIER_STYLE[summary?.tier ?? "dong"] ?? TIER_STYLE.dong
              }`}
            >
              <Gem className="size-6" />
            </div>
            <div>
              <p className="font-sans text-[13px] text-gray-500">Hạng thành viên</p>
              <p className="font-sans text-[18px] font-bold text-gray-900">{summary?.tier_label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-sans text-[13px] text-gray-500">Tổng chi tiêu</p>
            <p className="font-sans text-[16px] font-semibold text-gray-800">
              {formatPrice(summary?.total_spent ?? 0)}
            </p>
          </div>
        </div>

        {summary?.next_tier && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary500 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((summary.total_spent) /
                      ((summary.total_spent + summary.next_tier.remaining) || 1)) *
                      100,
                  )}%`,
                }}
              />
            </div>
            <p className="mt-2 font-sans text-[12px] text-gray-500">
              Mua thêm <span className="font-semibold text-primary500">{formatPrice(summary.next_tier.remaining)}</span>{" "}
              để lên hạng <span className="font-semibold text-primary500">{summary.next_tier.label}</span>
            </p>
          </div>
        )}
        {!summary?.next_tier && (
          <p className="mt-4 font-sans text-[12px] text-gray-500">
            Bạn đang ở hạng thành viên cao nhất — cảm ơn bạn đã đồng hành cùng ShopTech!
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-sans text-[15px] font-bold text-gray-800">Ưu đãi dành cho hạng của bạn</h3>

        {message && (
          <p className="mb-3 rounded-lg bg-primary500/5 px-3 py-2 font-sans text-[12px] font-medium text-primary500">
            {message}
          </p>
        )}

        {vouchers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 p-4 sm:p-6 text-center font-sans text-[13px] text-gray-400">
            Hiện chưa có voucher nào dành cho hạng của bạn. Mua thêm để lên hạng và mở khóa ưu đãi!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {vouchers.map((v) => (
              <VoucherCard key={v.id} voucher={v} claiming={claimingId === v.id} onClaim={handleClaim} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VouchersTab;
