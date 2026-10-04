import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock4, Loader2, XCircle } from "lucide-react";
import { getOrder } from "../services/orders";
import { formatPrice } from "../libs/format";
import { type Order } from "../types/order";

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const status = params.get("status");
  const orderId = params.get("order_id");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) return;
    getOrder(Number(orderId))
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [orderId]);

  const isSuccess = status === "success";
  const isPending = status === "pending";

  return (
    <div className="mx-auto flex max-w-[600px] flex-col items-center gap-4 px-4 py-20 text-center">
      {isSuccess ? (
        <CheckCircle2 className="size-16 text-emerald-500" />
      ) : isPending ? (
        <Clock4 className="size-16 text-amber-500" />
      ) : (
        <XCircle className="size-16 text-rose-500" />
      )}

      <h1 className="font-sans text-[20px] font-bold text-gray-900">
        {isSuccess
          ? "Thanh toán thành công!"
          : isPending
            ? "Đang chờ xác nhận thanh toán"
            : "Thanh toán không thành công"}
      </h1>

      {loading ? (
        <Loader2 className="size-6 animate-spin text-gray-400" />
      ) : order ? (
        <div className="w-full rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm">
          <div className="flex items-center justify-between font-sans text-[14px] text-gray-600">
            <span>Mã đơn hàng</span>
            <span className="font-semibold text-gray-800">#{order.id}</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-sans text-[14px] text-gray-600">
            <span>Số tiền</span>
            <span className="font-semibold text-gray-800">{formatPrice(order.total_amount)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-sans text-[14px] text-gray-600">
            <span>Trạng thái</span>
            <span
              className={`font-semibold ${
                order.status === "paid"
                  ? "text-emerald-600"
                  : order.status === "pending"
                    ? "text-amber-600"
                    : "text-rose-600"
              }`}
            >
              {order.status === "paid"
                ? "Đã thanh toán"
                : order.status === "pending"
                  ? "Chờ xác nhận"
                  : "Đã hủy"}
            </span>
          </div>
        </div>
      ) : (
        <p className="font-sans text-[14px] text-gray-500">
          {isSuccess
            ? "Đơn hàng của bạn đã được ghi nhận."
            : isPending
              ? "Giao dịch đang được ngân hàng xử lý, vui lòng đợi trong ít phút."
              : "Đơn hàng đã bị hủy do thanh toán không thành công, vui lòng thử lại."}
        </p>
      )}

      <div className="mt-2 flex gap-3">
        {order && (
          <Link
            to={`/tai-khoan/don-hang/${order.id}`}
            className="rounded-xl border-2 border-primary500 px-6 py-2.5 font-sans text-[14px] font-bold text-primary500 transition-colors hover:bg-primary500/5"
          >
            Xem đơn hàng
          </Link>
        )}
        <Link
          to="/"
          className="rounded-xl bg-primary500 px-6 py-2.5 font-sans text-[14px] font-bold text-white transition-colors hover:bg-primary500/90"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
