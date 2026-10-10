import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../libs/format";
import {
  fetchStoreInstallment,
  quoteInstallment,
  type StoreInstallmentOptions,
} from "../../libs/installment";

interface InstallmentBadgeProps {
  storeId?: number | null;
  price: number;
}

export function InstallmentBadge({ storeId, price }: InstallmentBadgeProps) {
  const [config, setConfig] = useState<StoreInstallmentOptions | null>(null);

  useEffect(() => {
    if (!storeId) return;
    fetchStoreInstallment(storeId)
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [storeId]);

  if (!config || !config.enabled || price < config.min_order) return null;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <p className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-blue-700">
        <Landmark className="size-4" /> Mua trả góp tại {config.store_name}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {config.options.map((option) => {
          const quote = quoteInstallment(price, option);
          return (
            <div key={option.months} className="rounded-lg bg-white px-2 py-1.5 text-center shadow-sm">
              <p className="font-sans text-[11px] text-gray-500">{option.months} tháng</p>
              <p className="font-sans text-[13px] font-bold text-blue-700">{formatPrice(quote.monthlyPayment)}</p>
              <p className="font-sans text-[10px] text-gray-400">
                {option.monthly_rate === 0 ? "Lãi 0%" : `Lãi ${option.monthly_rate}%/tháng`}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 font-sans text-[11px] text-gray-500">
        Chọn "Trả góp" ở bước thanh toán. Gian hàng sẽ xem yêu cầu và quyết định cho vay; được chấp nhận thì bạn thanh
        toán kỳ đầu qua MoMo.{" "}
        <Link to="/tai-khoan/tra-gop" className="font-semibold text-blue-600 hover:underline">
          Khoản trả góp của tôi
        </Link>
      </p>
    </div>
  );
}
