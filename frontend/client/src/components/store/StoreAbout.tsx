import { ShieldCheck } from "lucide-react";
import { type Store } from "../../types/product";

interface StoreAboutProps {
  store: Store;
}

export function StoreAbout({ store }: StoreAboutProps) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <div>
        <h3 className="mb-2 font-sans text-[16px] font-bold text-gray-800">
          Giới thiệu
        </h3>
        <p className="font-sans text-[14px] leading-relaxed text-gray-600">
          {store.description ||
            "Gian hàng chưa cập nhật giới thiệu."}
        </p>
      </div>

      <div>
        <h3 className="mb-3 font-sans text-[16px] font-bold text-gray-800">
          Chính sách của shop
        </h3>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="font-sans text-[14px] font-semibold text-gray-800">
              Bảo hành
            </div>
            <div className="font-sans text-[13px] text-gray-500">
              Sản phẩm có bảo hành theo chính sách của gian hàng.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
