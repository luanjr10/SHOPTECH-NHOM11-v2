import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import {
  Calendar,
  CheckCircle2,
  MapPin,
  Phone,
  Store,
  User,
  X,
  XCircle,
} from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import { useModulePermission } from "../../hooks/useModulePermission";
import {
  SellerApplication,
  SellerApplicationStatus,
} from "../../types/sellerApplication.types";

const STATUS_BADGE: Record<SellerApplicationStatus, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const STATUS_LABEL: Record<SellerApplicationStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

interface Props {
  open: boolean;
  application: SellerApplication | null;
  processing?: boolean;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
}

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
        <div className="truncate font-medium text-gray-200">{value || "—"}</div>
      </div>
    </div>
  );
}

export default function SellerApplicationDetailModal({
  open,
  application,
  processing,
  onClose,
  onApprove,
  onReject,
}: Props) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const { canEdit } = useModulePermission("seller_applications");

  useEffect(() => {
    setRejecting(false);
    setReason("");
  }, [application?.id]);

  if (!application) return null;

  const isPending = application.status === "pending";

  return (
    <Modal show={open} size="2xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-semibold text-white">
              Chi tiết đơn đăng ký người bán
            </h3>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 cursor-pointer"
              onClick={onClose}
            >
              <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-100">
                  {application.user?.name}
                </div>
                <div className="text-xs text-gray-500">
                  @{application.user?.username} · {application.user?.email}
                </div>
              </div>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[application.status]}`}
            >
              {STATUS_LABEL[application.status]}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow
              icon={Store}
              label="Tên gian hàng dự kiến"
              value={application.shop_name}
            />
            <DetailRow icon={Phone} label="Số điện thoại" value={application.phone} />
            <DetailRow icon={MapPin} label="Địa chỉ" value={application.address} />
            <DetailRow
              icon={Calendar}
              label="Ngày gửi đơn"
              value={formatDate(application.created_at)}
            />
          </div>

          {application.category_names && application.category_names.length > 0 && (
            <div>
              <div className="mb-2 text-xs text-gray-500">
                Danh mục kinh doanh
              </div>
              <div className="flex flex-wrap gap-2">
                {application.category_names.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {application.status === "rejected" && application.reject_reason && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <span className="font-medium">Lý do từ chối: </span>
              {application.reject_reason}
            </div>
          )}

          {isPending && rejecting && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Lý do từ chối (tuỳ chọn)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Thông tin gian hàng chưa hợp lệ..."
                className="w-full rounded-lg border border-slate-700 bg-transparent px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            {!canEdit ? (
              <span className="text-sm text-gray-500">Bạn không có quyền duyệt/từ chối đơn đăng ký.</span>
            ) : isPending ? (
              rejecting ? (
                <>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onReject(application.id, reason)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" />
                    Xác nhận từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(false)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-slate-800 cursor-pointer"
                  >
                    Quay lại
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onApprove(application.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Duyệt đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" />
                    Từ chối
                  </button>
                </>
              )
            ) : (
              <span className="text-sm text-gray-500">
                Đơn này đã được xử lý.
              </span>
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
