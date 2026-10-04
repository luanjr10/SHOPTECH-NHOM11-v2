import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { Calendar, MapPin, Package, Percent, Phone, ShieldCheck, Store as StoreIcon, Truck, User, X } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { PlatformFundOrder } from "../../types/platformFunds.types";

export type PlatformFundOrderDetail = PlatformFundOrder;

const STATUS_LABEL: Record<string, string> = {
  shipping: "Đang giao",
  delivered: "Đã giao — chờ khách xác nhận",
  completed: "Hoàn tất",
};

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-medium text-gray-200">{value === "" || value == null ? "—" : value}</div>
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  order: PlatformFundOrderDetail | null;
  onClose: () => void;
}

export default function PlatformFundOrderDetailModal({ open, order, onClose }: Props) {
  if (!order) return null;

  const amount = order.status === "completed" ? order.settled_amount : order.held_amount;

  return (
    <Modal show={open} size="2xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-semibold text-white">Chi tiết đơn #{order.order_id}</h3>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 cursor-pointer"
              onClick={onClose}
            >
              <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-white/[0.02] p-4">
            <div>
              <div className="text-xs text-gray-500">
                {order.status === "completed" ? "Số tiền đã giải ngân" : "Số tiền đang giữ"}
              </div>
              <div className="text-lg font-bold text-gray-100">{formatMoneyVietNam(amount ?? 0)}</div>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                order.customer_received
                  ? "border-teal-500/20 bg-teal-500/10 text-teal-400"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-400"
              }`}
            >
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow icon={StoreIcon} label="Gian hàng" value={order.store?.name} />
            <DetailRow icon={User} label="Người bán" value={order.seller_profile?.user?.name} />
            <DetailRow icon={User} label="Người nhận" value={order.order?.receiver_name} />
            <DetailRow icon={Phone} label="SĐT người nhận" value={order.order?.receiver_phone} />
            <DetailRow icon={Percent} label="Hoa hồng sàn" value={`${order.commission_rate}%`} />
            <DetailRow icon={Calendar} label="Ngày đặt" value={formatDate(order.created_at)} />
            {order.completed_at && <DetailRow icon={Calendar} label="Ngày hoàn tất" value={formatDate(order.completed_at)} />}
            {order.shipment?.expected_delivery_time && (
              <DetailRow icon={Truck} label="Dự kiến giao" value={formatDate(order.shipment.expected_delivery_time)} />
            )}
          </div>

          {order.order?.shipping_address && (
            <DetailRow icon={MapPin} label="Địa chỉ giao hàng" value={order.order.shipping_address} />
          )}

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
              <Package className="h-3.5 w-3.5" /> Sản phẩm trong đơn
            </div>
            <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate text-gray-200">{item.product_name}</div>
                    <div className="text-xs text-gray-500">
                      {item.unit_price ? formatMoneyVietNam(Number(item.unit_price)) : ""} × {item.quantity}
                    </div>
                  </div>
                  {item.line_total && (
                    <div className="shrink-0 font-medium text-gray-300">{formatMoneyVietNam(Number(item.line_total))}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-white/[0.02] px-4 py-3 text-sm">
            <span className="flex items-center gap-1.5 text-gray-400">
              <ShieldCheck className="h-4 w-4" /> Tạm tính đơn
            </span>
            <span className="font-semibold text-gray-100">{formatMoneyVietNam(Number(order.subtotal))}</span>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
