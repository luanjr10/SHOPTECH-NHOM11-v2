import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { Banknote, Calendar, FileText, Hash, ShieldCheck, User, X } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { PAYOUT_METHOD_LABEL } from "../../helpers/paymentMethods";
import { PayoutMethod } from "../../types/withdrawal.types";

export interface WithdrawalDetail {
  id: number;
  amount: number | string;
  method: PayoutMethod;
  status: "pending" | "approved" | "rejected";
  bank_account: string;
  bank_name: string;
  note?: string | null;
  payout_reference?: string | null;
  paid_at?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  seller_profile?: { user?: { name: string; username: string; email?: string } };
  reviewer?: { name: string } | null;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ duyệt", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  approved: { label: "Đã duyệt", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  rejected: { label: "Từ chối", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
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
        <div className="truncate font-medium text-gray-200">{value === "" || value == null ? "—" : value}</div>
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  withdrawal: WithdrawalDetail | null;
  onClose: () => void;
  onApprove?: (w: WithdrawalDetail) => void;
  onReject?: (id: number) => void;
}

export default function WithdrawalDetailModal({ open, withdrawal, onClose, onApprove, onReject }: Props) {
  if (!withdrawal) return null;

  const meta = STATUS_META[withdrawal.status] ?? STATUS_META.pending;

  return (
    <Modal show={open} size="2xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-semibold text-white">Chi tiết yêu cầu rút tiền #{withdrawal.id}</h3>
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
                <div className="font-semibold text-gray-100">{withdrawal.seller_profile?.user?.name ?? "—"}</div>
                <div className="text-xs text-gray-500">
                  @{withdrawal.seller_profile?.user?.username} · {withdrawal.seller_profile?.user?.email}
                </div>
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
              {meta.label}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow icon={Banknote} label="Số tiền" value={formatMoneyVietNam(Number(withdrawal.amount))} />
            <DetailRow icon={ShieldCheck} label="Kênh nhận" value={PAYOUT_METHOD_LABEL[withdrawal.method] ?? withdrawal.method} />
            <DetailRow icon={Hash} label="Tài khoản/SĐT nhận" value={`${withdrawal.bank_name} — ${withdrawal.bank_account}`} />
            <DetailRow icon={Calendar} label="Ngày gửi yêu cầu" value={formatDate(withdrawal.created_at)} />
            {withdrawal.payout_reference && (
              <DetailRow icon={Hash} label="Mã giao dịch sandbox" value={withdrawal.payout_reference} />
            )}
            {withdrawal.paid_at && <DetailRow icon={Calendar} label="Ngày giải ngân" value={formatDate(withdrawal.paid_at)} />}
            {withdrawal.reviewer && <DetailRow icon={User} label="Xử lý bởi" value={withdrawal.reviewer.name} />}
          </div>

          {withdrawal.note && (
            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-white/[0.02] p-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <p className="text-sm text-gray-300">{withdrawal.note}</p>
            </div>
          )}

          {withdrawal.status === "pending" && (onApprove || onReject) && (
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              {onApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(withdrawal)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 cursor-pointer"
                >
                  {withdrawal.method === "cod" ? "Duyệt" : `Thanh toán qua ${PAYOUT_METHOD_LABEL[withdrawal.method]}`}
                </button>
              )}
              {onReject && (
                <button
                  type="button"
                  onClick={() => onReject(withdrawal.id)}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 cursor-pointer"
                >
                  Từ chối
                </button>
              )}
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
