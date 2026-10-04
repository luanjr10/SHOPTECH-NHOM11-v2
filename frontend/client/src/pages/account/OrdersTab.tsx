import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2, PackageSearch } from "lucide-react";
import { getMyOrders } from "../../services/orders";
import { formatPrice } from "../../libs/format";
import { type Order, type OrderStatus } from "../../types/order";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Chờ xử lý",
  paid: "Đã thanh toán",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  paid: "bg-sky-50 text-sky-600 border-sky-200",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-600 border-rose-200",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders()
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-sans text-[18px] font-bold text-gray-800">Đơn hàng của tôi</h2>
        <p className="font-sans text-[13px] text-gray-500">
          Theo dõi trạng thái các đơn hàng đã đặt
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-7 animate-spin text-primary500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <PackageSearch className="size-10 text-gray-300" />
          <p className="font-sans text-[14px] text-gray-500">Bạn chưa có đơn hàng nào</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const itemCount = order.seller_orders.reduce(
              (sum, so) => sum + so.items.reduce((s, i) => s + i.quantity, 0),
              0,
            );
            return (
              <Link
                key={order.id}
                to={`/tai-khoan/don-hang/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 transition-colors sm:p-4 hover:border-primary500/40 hover:bg-primary500/5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-[14px] font-semibold text-gray-800">
                      Đơn #{order.id}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium ${STATUS_CLASS[order.status]}`}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-[13px] text-gray-500">
                    {formatDate(order.created_at)} · {itemCount} sản phẩm
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-sans text-[14px] font-bold text-primary500 sm:text-[15px]">
                    {formatPrice(order.total_amount)}
                  </span>
                  <ChevronRight className="size-4 text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrdersTab;
