import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Store as StoreIcon,
  Truck,
  XCircle,
} from "lucide-react";
import { cancelOrder, completeSellerOrder, getOrder } from "../../services/orders";
import { formatExpectedDate, formatPrice } from "../../libs/format";
import { type ApiError } from "../../libs/api";
import {
  isOrderCancellable,
  type Order,
  type OrderItem,
  type OrderStatus,
  type ReturnRequest,
  type SellerOrderStatus,
} from "../../types/order";
import ReturnRequestModal from "../../components/ReturnRequestModal";

const SELLER_STATUS_LABEL: Record<SellerOrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao hàng",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const SELLER_STATUS_CLASS: Record<SellerOrderStatus, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  confirmed: "bg-sky-50 text-sky-600 border-sky-200",
  shipping: "bg-violet-50 text-violet-600 border-violet-200",
  delivered: "bg-teal-50 text-teal-600 border-teal-200",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-600 border-rose-200",
};

const TIMELINE_STEPS: { status: SellerOrderStatus; label: string }[] = [
  { status: "confirmed", label: "Đã xác nhận" },
  { status: "shipping", label: "Đang giao" },
  { status: "delivered", label: "Đã giao hàng" },
  { status: "completed", label: "Hoàn tất" },
];
const TIMELINE_ORDER: SellerOrderStatus[] = ["pending", "confirmed", "shipping", "delivered", "completed"];

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Chờ xử lý",
  paid: "Đã thanh toán",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  paid: "bg-sky-50 text-sky-600 border-sky-200",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-600 border-rose-200",
};

const RETURN_STATUS_LABEL: Record<ReturnRequest["status"], string> = {
  pending: "Đang chờ seller phản hồi",
  approved: "Đã được duyệt",
  rejected: "Đã bị từ chối",
};

const RETURN_STATUS_CLASS: Record<ReturnRequest["status"], string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  approved: "bg-emerald-50 text-emerald-600 border-emerald-200",
  rejected: "bg-rose-50 text-rose-600 border-rose-200",
};

const RETURN_TYPE_LABEL: Record<ReturnRequest["type"], string> = {
  return: "Hoàn trả",
  warranty: "Bảo hành",
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  momo: "Ví MoMo",
  vnpay: "VNPay",
  onepay: "OnePay",
  sepay: "SePay",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function OrderDetailTab() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [returnModalItem, setReturnModalItem] = useState<OrderItem | null>(null);

  useEffect(() => {
    if (!id) return;
    getOrder(Number(id))
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!order || !window.confirm("Bạn chắc chắn muốn hủy đơn hàng này?")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      setOrder(await cancelOrder(order.id));
    } catch (err) {
      setCancelError((err as ApiError)?.message ?? "Hủy đơn hàng thất bại.");
    } finally {
      setCancelling(false);
    }
  };

  const handleComplete = async (sellerOrderId: number) => {
    if (!order || !window.confirm("Xác nhận bạn đã nhận được hàng?")) return;
    setCompletingId(sellerOrderId);
    setCompleteError(null);
    try {
      await completeSellerOrder(order.id, sellerOrderId);
      setOrder(await getOrder(order.id));
    } catch (err) {
      setCompleteError((err as ApiError)?.message ?? "Xác nhận nhận hàng thất bại.");
    } finally {
      setCompletingId(null);
    }
  };

  const handleReturnSubmitted = (returnRequest: ReturnRequest) => {
    setOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        seller_orders: prev.seller_orders.map((so) => ({
          ...so,
          items: so.items.map((item) =>
            item.id === returnRequest.order_item_id ? { ...item, return_request: returnRequest } : item,
          ),
        })),
      };
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-7 animate-spin text-primary500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 sm:p-10 text-center font-sans text-[14px] text-gray-500 shadow-sm">
        Không tìm thấy đơn hàng.
      </div>
    );
  }

  const productSubtotal =
    Number(order.total_amount) - Number(order.shipping_fee) + Number(order.discount_amount);
  const cancellable = isOrderCancellable(order);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/tai-khoan/don-hang"
          className="flex items-center gap-1.5 font-sans text-[13px] font-medium text-gray-500 hover:text-primary500"
        >
          <ArrowLeft className="size-4" /> Quay lại<span className="hidden sm:inline"> danh sách đơn hàng</span>
        </Link>
        {cancellable && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 font-sans text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
            Hủy đơn hàng
          </button>
        )}
      </div>

      {cancelError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 font-sans text-[13px] font-medium text-rose-600">
          <AlertTriangle className="size-4 shrink-0" /> {cancelError}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-sans text-[18px] font-bold text-gray-800">
              Đơn hàng #{order.id}
            </h2>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 font-sans text-[12px] font-medium ${ORDER_STATUS_CLASS[order.status]}`}
            >
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>
          <span className="font-sans text-[13px] text-gray-500">
            Đặt lúc {formatDate(order.created_at)}
          </span>
        </div>

        {!cancellable && order.status !== "cancelled" && (
          <p className="mt-3 flex items-center gap-1.5 font-sans text-[12px] text-gray-400">
            <AlertTriangle className="size-3.5" />
            Đơn hàng đã được xác nhận/đang giao, không thể hủy trực tuyến. Vui lòng liên hệ hỗ trợ nếu cần.
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary500" />
            <div className="font-sans text-[13px] text-gray-600">
              <p className="font-semibold text-gray-800">{order.receiver_name} - {order.receiver_phone}</p>
              <p>{order.shipping_address}</p>
            </div>
          </div>
          <div className="font-sans text-[13px] text-gray-600">
            <p>
              Phương thức thanh toán:{" "}
              <span className="font-semibold text-gray-800">
                {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
              </span>
            </p>
            {formatExpectedDate(order.expected_delivery_time) && (
              <p className="mt-1">
                Dự kiến nhận hàng:{" "}
                <span className="font-semibold text-gray-800">
                  {formatExpectedDate(order.expected_delivery_time)}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {completeError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 font-sans text-[13px] font-medium text-rose-600">
          <AlertTriangle className="size-4 shrink-0" /> {completeError}
        </div>
      )}

      {order.seller_orders.map((sellerOrder) => {
        const currentStepIndex = TIMELINE_ORDER.indexOf(sellerOrder.status);
        const isTerminalOther = sellerOrder.status === "pending" || sellerOrder.status === "cancelled";

        return (
          <div key={sellerOrder.id} className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-sans text-[14px] font-semibold text-gray-800">
                <StoreIcon className="size-4 text-primary500" />
                {sellerOrder.store?.name ?? "Gian hàng"}
              </div>
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 font-sans text-[12px] font-medium ${SELLER_STATUS_CLASS[sellerOrder.status]}`}
              >
                {SELLER_STATUS_LABEL[sellerOrder.status]}
              </span>
            </div>

            {!isTerminalOther && (
              <div className="mb-4 flex items-center gap-1">
                {TIMELINE_STEPS.map((step, idx) => {
                  const stepIndex = TIMELINE_ORDER.indexOf(step.status);
                  const done = currentStepIndex >= stepIndex;
                  return (
                    <div key={step.status} className="flex flex-1 items-center gap-1">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full font-sans text-[10px] font-bold ${
                            done ? "bg-primary500 text-white" : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {done ? "✓" : idx + 1}
                        </span>
                        <span
                          className={`whitespace-nowrap font-sans text-[11px] ${done ? "text-gray-700" : "text-gray-400"}`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {idx < TIMELINE_STEPS.length - 1 && (
                        <span className={`h-0.5 flex-1 ${done ? "bg-primary500" : "bg-gray-100"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {sellerOrder.shipment && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-3 font-sans text-[13px] text-violet-700">
                <Truck className="size-4 shrink-0" />
                <span>
                  {sellerOrder.shipment.tracking_number ? (
                    <>
                      Mã vận đơn: <strong className="font-mono">{sellerOrder.shipment.tracking_number}</strong>
                    </>
                  ) : (
                    "Gian hàng đang tự giao hàng cho bạn"
                  )}
                  {formatExpectedDate(sellerOrder.shipment.expected_delivery_time) && (
                    <> · Dự kiến nhận {formatExpectedDate(sellerOrder.shipment.expected_delivery_time)}</>
                  )}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {sellerOrder.items.map((item) => (
                <div key={item.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-sans text-[13px] font-medium text-gray-700">
                        {item.product_name}
                      </p>
                      <p className="font-sans text-[12px] text-gray-400">
                        {formatPrice(item.unit_price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 font-sans text-[13px] font-semibold text-gray-800">
                      {formatPrice(item.line_total)}
                    </p>
                  </div>

                  {sellerOrder.status === "completed" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {sellerOrder.warranty?.applicable && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-[11px] font-medium ${
                            sellerOrder.warranty.status === "con_han"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                              : "border-gray-200 bg-gray-50 text-gray-500"
                          }`}
                        >
                          {sellerOrder.warranty.status === "con_han" ? (
                            <ShieldCheck className="size-3" />
                          ) : (
                            <ShieldOff className="size-3" />
                          )}
                          {sellerOrder.warranty.label}
                        </span>
                      )}

                      {item.return_request ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-[11px] font-medium ${RETURN_STATUS_CLASS[item.return_request.status]}`}
                          title={item.return_request.seller_response ?? undefined}
                        >
                          <Clock className="size-3" />
                          {RETURN_TYPE_LABEL[item.return_request.type]}: {RETURN_STATUS_LABEL[item.return_request.status]}
                        </span>
                      ) : (
                        sellerOrder.can_request_return && (
                          <button
                            type="button"
                            onClick={() => setReturnModalItem(item)}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 font-sans text-[11px] font-medium text-gray-600 transition-colors hover:border-primary500 hover:text-primary500"
                          >
                            <RotateCcw className="size-3" />
                            Yêu cầu hoàn trả / bảo hành
                          </button>
                        )
                      )}

                      {item.return_request?.seller_response && (
                        <p className="w-full font-sans text-[11px] italic text-gray-500">
                          Phản hồi từ shop: "{item.return_request.seller_response}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {sellerOrder.status === "delivered" && (
              <button
                type="button"
                onClick={() => handleComplete(sellerOrder.id)}
                disabled={completingId === sellerOrder.id}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary500 py-2.5 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-60"
              >
                {completingId === sellerOrder.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PackageCheck className="size-4" />
                )}
                Đã nhận được hàng
              </button>
            )}
            {sellerOrder.status === "completed" && (
              <p className="mt-4 flex items-center gap-1.5 font-sans text-[12px] font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Bạn đã xác nhận nhận hàng
              </p>
            )}
          </div>
        );
      })}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between font-sans text-[14px] text-gray-600">
          <span>Tạm tính</span>
          <span>{formatPrice(productSubtotal)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between font-sans text-[14px] text-gray-600">
          <span>Phí vận chuyển</span>
          <span>{order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : "Miễn phí"}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="mt-1 flex items-center justify-between font-sans text-[14px] text-emerald-600">
            <span>Giảm giá {order.discount_code ? `(${order.discount_code})` : ""}</span>
            <span>-{formatPrice(order.discount_amount)}</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 font-sans text-[16px] font-bold text-gray-900">
          <span>Tổng cộng</span>
          <span className="text-primary500">{formatPrice(order.total_amount)}</span>
        </div>
      </div>

      {returnModalItem && (
        <ReturnRequestModal
          open={!!returnModalItem}
          orderItemId={returnModalItem.id}
          productName={returnModalItem.product_name}
          onClose={() => setReturnModalItem(null)}
          onSubmitted={handleReturnSubmitted}
        />
      )}
    </div>
  );
}

export default OrderDetailTab;
