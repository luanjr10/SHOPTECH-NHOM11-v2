import { Check, ShieldCheck } from "lucide-react";
import { type Store } from "../../types/product";

interface StoreTrustCenterProps {
  store: Store;
}

export function StoreTrustCenter({ store }: StoreTrustCenterProps) {
  const completed = store.stats?.completed_orders ?? 0;

  const items = [
    "Hồ sơ người bán đang hiển thị công khai",
    `${completed} đơn đã hoàn thành`,
    "Chưa ghi nhận khiếu nại công khai",
    "Sản phẩm có chính sách bảo hành rõ ràng",
  ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <h3 className="mb-4 flex items-center gap-2 font-sans text-[16px] font-bold text-gray-800">
        <ShieldCheck className="size-5 text-primary500" />
        Trung tâm uy tín
      </h3>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 font-sans text-[13px] text-gray-600"
          >
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-3" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
