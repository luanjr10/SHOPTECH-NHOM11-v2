import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { Banknote, Calendar, FileText, Hash, ShieldCheck, Wallet as WalletIcon, X } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { PAYOUT_METHOD_LABEL } from "../../helpers/paymentMethods";
import { WalletInfo, WithdrawalItem } from "../../types/seller.types";

const STATUS_META: Record<WithdrawalItem["status"], { label: string; className: string }> = {
  pending: { label: "Chờ duyệt", className: "bg-amber-50 text-amber-600 border-amber-200" },
  approved: { label: "Đã duyệt", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  rejected: { label: "Bị từ chối", className: "bg-rose-50 text-rose-600 border-rose-200" },
};

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof WalletIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div className="truncate font-medium text-gray-800 dark:text-white">
          {value === "" || value == null ? "—" : value}
        </div>
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  withdrawal: WithdrawalItem | null;
  wallet: WalletInfo | null;
  onClose: () => void;
}

export default function WithdrawalDetailModal({ open, withdrawal, wallet, onClose }: Props) {
  if (!withdrawal) return null;

  const meta = STATUS_META[withdrawal.status];

  return (
    <Modal show={open} size="2xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Chi tiết yêu cầu rút tiền #{withdrawal.id}
            </h3>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 cursor-pointer"
              onClick={onClose}
            >
              <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-3">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Tổng số dư</div>
              <div className="font-semibold text-gray-800 dark:text-white">
                {formatMoneyVietNam(Number(wallet?.balance ?? 0))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Đang chờ (chưa hoàn tất đơn)</div>
              <div className="font-semibold text-amber-600 dark:text-amber-400">
                {formatMoneyVietNam(Number(wallet?.pending_balance ?? 0))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Có thể rút hợp lệ ngay bây giờ</div>
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatMoneyVietNam(Number(wallet?.withdrawable_balance ?? 0))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Số tiền yêu cầu rút</div>
              <div className="text-lg font-bold text-gray-800 dark:text-white">
                {formatMoneyVietNam(Number(withdrawal.amount))}
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
              {meta.label}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow icon={ShieldCheck} label="Kênh nhận" value={PAYOUT_METHOD_LABEL[withdrawal.method] ?? withdrawal.method} />
            <DetailRow icon={Hash} label="Tài khoản/SĐT nhận" value={`${withdrawal.bank_name} — ${withdrawal.bank_account}`} />
            <DetailRow icon={Calendar} label="Ngày gửi yêu cầu" value={formatDate(withdrawal.created_at)} />
            {withdrawal.paid_at && <DetailRow icon={Calendar} label="Ngày giải ngân" value={formatDate(withdrawal.paid_at)} />}
            {withdrawal.payout_reference && (
              <DetailRow icon={Hash} label="Mã giao dịch" value={withdrawal.payout_reference} />
            )}
            <DetailRow icon={Banknote} label="Trạng thái" value={meta.label} />
          </div>

          {withdrawal.note && (
            <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{withdrawal.note}</p>
            </div>
          )}

          {withdrawal.status === "pending" && (
            <p className="text-xs text-gray-400">
              Yêu cầu đang chờ admin xử lý. Số tiền này đã được giữ chỗ khỏi "Có thể rút" ở trên để tránh rút trùng.
            </p>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
