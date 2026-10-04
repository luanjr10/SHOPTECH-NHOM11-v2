import {
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  Layers,
  ShoppingBag,
  Star,
  TrendingUp,
} from "lucide-react";
import { type Store } from "../../types/product";

interface StoreSellerInfoProps {
  store: Store;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function StoreSellerInfo({ store }: StoreSellerInfoProps) {
  const s = store.stats;

  const rows: { icon: typeof Star; label: string; value: React.ReactNode }[] = [
    { icon: ShoppingBag, label: "Đã bán", value: s?.completed_orders ?? 0 },
    {
      icon: Star,
      label: "Đánh giá",
      value: s?.rating_count ? `${s.rating?.toFixed(1)} (${s.rating_count})` : "Chưa có",
    },
    { icon: CalendarDays, label: "Tham gia từ", value: formatDate(store.joined_at) },
    { icon: Layers, label: "Sản phẩm đang bán", value: s?.products_count ?? 0 },
    {
      icon: TrendingUp,
      label: "Tỉ lệ hoàn thành",
      value: s?.completion_rate != null ? `${s.completion_rate}%` : "—",
    },
    { icon: ClipboardCheck, label: "Đơn 30 ngày", value: s?.orders_30d ?? 0 },
    {
      icon: BadgeCheck,
      label: "Cấp độ người bán",
      value: (
        <span className="font-semibold text-primary500">
          {s?.seller_level ?? "New Seller"}
        </span>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <h3 className="mb-4 font-sans text-[16px] font-bold text-gray-800">
        Thông tin người bán
      </h3>
      <div className="flex flex-col divide-y divide-gray-100">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className="flex items-center justify-between py-2.5"
            >
              <span className="flex items-center gap-2 font-sans text-[13px] text-gray-500">
                <Icon className="size-4 text-gray-400" />
                {row.label}
              </span>
              <span className="font-sans text-[14px] font-semibold text-gray-800">
                {row.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
