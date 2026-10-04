import { useState } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { FileText, Loader2, Mail, MapPin, X } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { emailOrderInvoice, orderInvoicePdfUrl } from "../../services/seller.services";
import type { SellerOrderItem } from "../../types/seller.types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao hàng",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const STATUS_META: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  shipping: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  delivered: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

interface Props {
  open: boolean;
  storeId: number;
  order: SellerOrderItem | null;
  loading: boolean;
  onClose: () => void;
}

export default function SellerInvoiceDetailModal({ open, storeId, order, loading, onClose }: Props) {
  const [sending, setSending] = useState(false);

  const handleEmail = async () => {
    if (!order) return;
    setSending(true);
    try {
      await emailOrderInvoice(storeId, order.id);
      notifySuccess("Đã gửi hóa đơn qua email cho khách hàng");
    } catch {
      notifyError("Gửi hóa đơn thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show={open} size="xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        {loading || !order ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xl font-semibold text-white">Hóa đơn đơn hàng #{order.id}</h3>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 cursor-pointer" onClick={onClose}>
                <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-white/[0.02] p-4">
              <div>
                <div className="font-semibold text-gray-100">{order.order?.receiver_name ?? "—"}</div>
                <div className="text-xs text-gray-500">{order.order?.receiver_phone}</div>
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_META[order.status]}`}>
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>

            {order.order?.shipping_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                <div className="text-gray-300">{order.order.shipping_address}</div>
              </div>
            )}

            <div className="rounded-lg border border-slate-800">
              <div className="divide-y divide-slate-800/60">
                {order.items?.map((item) => (
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

            <div className="space-y-1 border-t border-slate-800 pt-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Tạm tính</span>
                <span>{formatMoneyVietNam(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Phí vận chuyển</span>
                <span>{formatMoneyVietNam(Number(order.shipping_fee))}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-base font-bold text-white">
                <span>Tổng cộng</span>
                <span>{formatMoneyVietNam(Number(order.subtotal) + Number(order.shipping_fee))}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              <a
                href={orderInvoicePdfUrl(storeId, order.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
              >
                <FileText className="h-4 w-4" /> Tải PDF
              </a>
              <button
                type="button"
                disabled={sending}
                onClick={handleEmail}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
              >
                <Mail className="h-4 w-4" /> Gửi hóa đơn qua email
              </button>
            </div>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}
