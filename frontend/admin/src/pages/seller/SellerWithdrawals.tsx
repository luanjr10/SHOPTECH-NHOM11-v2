import { useCallback, useEffect, useState } from "react";
import { Label, Select, TextInput } from "flowbite-react";
import { ToastContainer } from "react-toastify";
import { Eye } from "lucide-react";
import { createWithdrawal, getWallet, getWithdrawals } from "../../services/seller.services";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { formatDate } from "../../helpers/formatDate";
import { PAYOUT_METHODS, PAYOUT_METHOD_LABEL } from "../../helpers/paymentMethods";
import DataTable, { Column } from "../../components/common/DataTable";
import FormModal from "../../components/common/FormModal";
import WithdrawalDetailModal from "../../components/seller-center/WithdrawalDetailModal";
import { PayoutMethod, WalletInfo, WithdrawalItem } from "../../types/seller.types";

const STATUS_META: Record<WithdrawalItem["status"], string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

const STATUS_LABEL: Record<WithdrawalItem["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

export default function SellerWithdrawals() {
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<WithdrawalItem | null>(null);

  const load = useCallback(() => {
    getWithdrawals(page).then((res) => {
      setItems(res.data ?? []);
      setLastPage(res.last_page ?? 1);
      setTotal(res.total ?? 0);
    });
    getWallet().then(setWallet);
  }, [page]);

  useEffect(load, [load]);

  const columns: Column<WithdrawalItem>[] = [
    { header: "Số tiền", render: (w) => formatMoneyVietNam(Number(w.amount)) },
    { header: "Kênh nhận", render: (w) => PAYOUT_METHOD_LABEL[w.method] ?? w.method },
    { header: "Tài khoản/SĐT", render: (w) => `${w.bank_name} — ${w.bank_account}` },
    {
      header: "Trạng thái",
      render: (w) => (
        <div className="flex flex-col gap-1">
          <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_META[w.status]}`}>
            {STATUS_LABEL[w.status]}
          </span>
          {w.payout_reference && (
            <span className="font-mono text-[11px] text-gray-400">{w.payout_reference}</span>
          )}
        </div>
      ),
    },
    { header: "Ngày yêu cầu", render: (w) => formatDate(w.created_at) },
    {
      header: "",
      align: "center",
      render: (w) => (
        <button
          onClick={() => setViewing(w)}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
        >
          <Eye className="size-3.5" /> Chi tiết
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Rút tiền</h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Tạo yêu cầu rút tiền
        </button>
      </div>

      <DataTable
        title="Lịch sử rút tiền"
        subtitle={`Số dư có thể rút: ${formatMoneyVietNam(Number(wallet?.withdrawable_balance ?? 0))}`}
        data={items}
        columns={columns}
        rowKey={(w) => w.id}
        currentPage={page}
        totalPages={lastPage}
        totalItems={total}
        onPageChange={setPage}
      />

      <ToastContainer />

      <WithdrawalFormModal
        open={open}
        maxAmount={Number(wallet?.withdrawable_balance ?? 0)}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          if (page === 1) load();
          else setPage(1);
        }}
      />

      <WithdrawalDetailModal
        open={!!viewing}
        withdrawal={viewing}
        wallet={wallet}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

function WithdrawalFormModal({
  open,
  maxAmount,
  onClose,
  onCreated,
}: {
  open: boolean;
  maxAmount: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>("cod");
  const activeMethod = PAYOUT_METHODS.find((m) => m.id === method)!;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount"));

    try {
      await createWithdrawal({
        amount,
        method,
        bank_account: String(form.get("bank_account")),
        bank_name: String(form.get("bank_name")),
        note: String(form.get("note") || ""),
      });
      notifySuccess("Đã gửi yêu cầu rút tiền");
      onCreated();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Tạo yêu cầu rút tiền thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Tạo yêu cầu rút tiền"
      onSubmit={handleSubmit}
      submitLabel={submitting ? "Đang gửi..." : "Gửi yêu cầu"}
      size="md"
    >
      <div>
        <Label htmlFor="amount">Số tiền muốn rút</Label>
        <TextInput id="amount" name="amount" type="number" min="1" max={maxAmount || undefined} required />
        <p className="mt-1 text-xs text-gray-400">Tối đa {formatMoneyVietNam(maxAmount)}</p>
      </div>
      <div>
        <Label htmlFor="method">Kênh nhận tiền</Label>
        <Select id="method" value={method} onChange={(e) => setMethod(e.target.value as PayoutMethod)}>
          {PAYOUT_METHODS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
        {method !== "cod" && (
          <p className="mt-1 text-xs text-gray-400">
            Sandbox thử nghiệm — giao dịch qua {activeMethod.label} sẽ được mô phỏng, chưa phải chuyển tiền thật.
          </p>
        )}
      </div>
      {method === "cod" && (
        <div>
          <Label htmlFor="bank_name">Ngân hàng</Label>
          <TextInput id="bank_name" name="bank_name" required placeholder="Vietcombank" />
        </div>
      )}
      <div>
        <Label htmlFor="bank_account">{activeMethod.accountLabel}</Label>
        <TextInput id="bank_account" name="bank_account" required placeholder={activeMethod.accountPlaceholder} />
        {method !== "cod" && <input type="hidden" name="bank_name" value={activeMethod.label} />}
      </div>
      <div>
        <Label htmlFor="note">Ghi chú (không bắt buộc)</Label>
        <TextInput id="note" name="note" />
      </div>
    </FormModal>
  );
}
