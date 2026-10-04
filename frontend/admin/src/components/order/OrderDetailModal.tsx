import { useState } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { FileText, Mail, MapPin, Store as StoreIcon, User, X } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { adminOrderInvoicePdfUrl, emailAdminOrderInvoice } from "../../services/marketplace.services";
import { useModulePermission } from "../../hooks/useModulePermission";
import type { AdminOrder } from "../../types/order.types";

const ORDER_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ xác nhận", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  paid: { label: "Đã thanh toán", className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  completed: { label: "Hoàn tất", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Đã hủy", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const SELLER_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao hàng",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

interface Props {
  open: boolean;
  order: AdminOrder | null;
  onClose: () => void;
}

export default function OrderDetailModal({ open, order, onClose }: Props) {
  const [sending, setSending] = useState(false);
  const { canEdit } = useModulePermission("orders");

  if (!order) return null;

  const meta = ORDER_STATUS_META[order.status] ?? ORDER_STATUS_META.pending;

  const handleEmail = async () => {
    setSending(true);
    try {
      await emailAdminOrderInvoice(order.id);
      notifySuccess("Đã gửi hóa đơn qua email cho khách hàng");
    } catch {
      notifyError("Gửi hóa đơn thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show={open} size="2xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-semibold text-white">Hóa đơn đơn hàng #{order.id}</h3>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 cursor-pointer" onClick={onClose}>
              <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
                <User className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-100">{order.user?.name}</div>
                <div className="text-xs text-gray-500">@{order.user?.username}</div>
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <div className="text-gray-300">
              <span className="font-medium text-gray-200">{order.receiver_name} - {order.receiver_phone}</span>
              <br />
              {order.shipping_address}
            </div>
          </div>

          {order.seller_orders.map((so) => (
            <div key={so.id} className="rounded-lg border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 bg-white/[0.02] px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <StoreIcon className="h-3.5 w-3.5 text-indigo-400" /> {so.store?.name ?? "Gian hàng"}
                </div>
                <span className="text-xs text-gray-400">{SELLER_STATUS_LABEL[so.status] ?? so.status}</span>
              </div>
              <div className="divide-y divide-slate-800/60">
                {so.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-gray-200">{item.product_name}</div>
                      <div className="text-xs text-gray-500">
                        {formatMoneyVietNam(Number(item.unit_price))} × {item.quantity}
                      </div>
                    </div>
                    <div className="shrink-0 font-medium text-gray-200">{formatMoneyVietNam(Number(item.line_total))}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-1 border-t border-slate-800 pt-3 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Phí vận chuyển</span>
              <span>{formatMoneyVietNam(Number(order.shipping_fee))}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Giảm giá {order.discount_code ? `(${order.discount_code})` : ""}</span>
                <span>-{formatMoneyVietNam(Number(order.discount_amount))}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-800 pt-2 text-base font-bold text-white">
              <span>Tổng cộng</span>
              <span>{formatMoneyVietNam(Number(order.total_amount))}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <a
              href={adminOrderInvoicePdfUrl(order.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
            >
              <FileText className="h-4 w-4" /> Tải PDF
            </a>
            {canEdit && (
              <button
                type="button"
                disabled={sending}
                onClick={handleEmail}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
              >
                <Mail className="h-4 w-4" /> Gửi hóa đơn qua email
              </button>
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
