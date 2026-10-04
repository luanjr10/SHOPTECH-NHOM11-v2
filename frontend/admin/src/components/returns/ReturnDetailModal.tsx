import { useState } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { Package, Phone, ShieldCheck, User, X } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { respondToReturn } from "../../services/seller.services";
import type { ReturnRequestItem } from "../../types/seller.types";

const TYPE_LABEL: Record<string, string> = { return: "Hoàn trả", warranty: "Bảo hành" };

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ xử lý", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  approved: { label: "Đã duyệt", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  rejected: { label: "Đã từ chối", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

interface Props {
  open: boolean;
  storeId: number;
  returnRequest: ReturnRequestItem | null;
  onClose: () => void;
  onResponded: () => void;
}

export default function ReturnDetailModal({ open, storeId, returnRequest, onClose, onResponded }: Props) {
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!returnRequest) return null;

  const meta = STATUS_META[returnRequest.status] ?? STATUS_META.pending;

  const handleRespond = async (status: "approved" | "rejected") => {
    if (!responseText.trim()) {
      notifyError("Vui lòng nhập phản hồi cho khách hàng");
      return;
    }
    setSubmitting(true);
    try {
      await respondToReturn(storeId, returnRequest.id, { status, seller_response: responseText.trim() });
      notifySuccess(status === "approved" ? "Đã duyệt yêu cầu — email đã gửi cho khách" : "Đã từ chối yêu cầu — email đã gửi cho khách");
      setResponseText("");
      onResponded();
    } catch {
      notifyError("Xử lý yêu cầu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={open} size="xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-semibold text-white">Chi tiết yêu cầu {TYPE_LABEL[returnRequest.type]}</h3>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 cursor-pointer" onClick={onClose}>
              <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-100">{returnRequest.order_item?.product_name ?? "—"}</div>
                <div className="text-xs text-gray-500">SL: {returnRequest.order_item?.quantity ?? "—"}</div>
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2 text-sm">
              <User className="mt-0.5 h-4 w-4 text-gray-500" />
              <div>
                <div className="text-gray-200">{returnRequest.user?.name}</div>
                <div className="text-xs text-gray-500">{returnRequest.user?.email}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Phone className="mt-0.5 h-4 w-4 text-gray-500" />
              <div className="text-gray-200">{returnRequest.user?.phone ?? "—"}</div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase text-gray-500">Lý do</div>
            <p className="rounded-lg border border-slate-800 bg-white/[0.02] p-3 text-sm text-gray-300">{returnRequest.reason}</p>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase text-gray-500">Ảnh minh chứng</div>
            <div className="flex flex-wrap gap-2">
              {returnRequest.images.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className="h-20 w-20 rounded-lg border border-slate-800 object-cover" />
                </a>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500">Gửi lúc {formatDate(returnRequest.created_at)}</div>

          {returnRequest.status === "pending" ? (
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <label className="text-xs font-semibold uppercase text-gray-500">Phản hồi cho khách hàng</label>
              <textarea
                rows={3}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="VD: Đã kiểm tra, đồng ý đổi trả — vui lòng gửi sản phẩm về địa chỉ..."
                className="w-full rounded-lg border border-gray-700 bg-[#0e1726] px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRespond("rejected")}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRespond("approved")}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                >
                  Duyệt yêu cầu
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-white/[0.02] p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-gray-200">Phản hồi đã gửi:</p>
                <p>{returnRequest.seller_response}</p>
                {returnRequest.responded_at && (
                  <p className="mt-1 text-xs text-gray-500">Lúc {formatDate(returnRequest.responded_at)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
