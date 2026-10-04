import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function OrderSuccessPage() {
  const location = useLocation();
  const state = location.state as { orderId?: number } | null;

  return (
    <div className="mx-auto flex max-w-[600px] flex-col items-center gap-4 px-4 py-20 text-center">
      <CheckCircle2 className="size-16 text-emerald-500" />
      <h1 className="font-sans text-[20px] font-bold text-gray-900">
        Đặt hàng thành công!
      </h1>
      <p className="font-sans text-[14px] text-gray-500">
        {state?.orderId
          ? `Mã đơn hàng của bạn là #${state.orderId}. `
          : ""}
        Chúng tôi sẽ liên hệ để xác nhận đơn hàng trong thời gian sớm nhất.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-xl bg-primary500 px-6 py-2.5 font-sans text-[14px] font-bold text-white transition-colors hover:bg-primary500/90"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
