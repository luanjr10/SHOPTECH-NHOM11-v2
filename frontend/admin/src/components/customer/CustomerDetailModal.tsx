import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { Calendar, Mail, Package, Phone, User, Wallet, X } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import TierBadge from "./TierBadge";

export interface CustomerOrderRow {
  id: number;
  status: string;
  total_amount: number | string;
  created_at: string;
}

export interface CustomerDetail {
  customer: {
    id: number;
    name: string;
    username: string;
    email: string;
    phone?: string | null;
    avatar_url?: string | null;
    created_at?: string;
  };
  tier: string;
  tier_label: string;
  total_spent: number;
  store_spent?: number;
  orders_count?: number;
  next_tier?: { tier: string; label: string; remaining: number } | null;
  orders?: CustomerOrderRow[];
  seller_orders?: CustomerOrderRow[];
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  paid: "Đã thanh toán",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
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
  detail: CustomerDetail | null;
  onClose: () => void;
}

export default function CustomerDetailModal({ open, detail, onClose }: Props) {
  if (!detail) return null;

  const orders = detail.orders ?? detail.seller_orders ?? [];

  return (
    <Modal show={open} size="2xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-semibold text-white">Chi tiết khách hàng</h3>
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
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-indigo-500/15 text-indigo-400">
                {detail.customer.avatar_url ? (
                  <img src={detail.customer.avatar_url} alt={detail.customer.name} className="h-11 w-11 object-cover" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-100">{detail.customer.name}</div>
                <div className="text-xs text-gray-500">@{detail.customer.username}</div>
              </div>
            </div>
            <TierBadge tier={detail.tier} label={detail.tier_label} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow icon={Mail} label="Email" value={detail.customer.email} />
            <DetailRow icon={Phone} label="Số điện thoại" value={detail.customer.phone} />
            <DetailRow
              icon={Wallet}
              label={detail.store_spent !== undefined ? "Đã chi tại gian hàng này" : "Tổng chi tiêu (toàn sàn)"}
              value={formatMoneyVietNam(detail.store_spent ?? detail.total_spent)}
            />
            <DetailRow icon={Calendar} label="Ngày tham gia" value={detail.customer.created_at ? formatDate(detail.customer.created_at) : "—"} />
          </div>

          {detail.next_tier && (
            <p className="rounded-lg border border-slate-800 bg-white/[0.02] p-3 text-sm text-gray-300">
              Còn thiếu <span className="font-semibold text-indigo-400">{formatMoneyVietNam(detail.next_tier.remaining)}</span> để
              lên hạng <span className="font-semibold text-indigo-400">{detail.next_tier.label}</span>.
            </p>
          )}

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-200">
              <Package className="h-4 w-4" /> Đơn hàng gần đây
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800">
              {orders.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">Chưa có đơn hàng nào.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Mã đơn</th>
                      <th className="px-3 py-2">Trạng thái</th>
                      <th className="px-3 py-2">Ngày đặt</th>
                      <th className="px-3 py-2 text-right">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-3 py-2 text-gray-300">#{o.id}</td>
                        <td className="px-3 py-2 text-gray-400">{ORDER_STATUS_LABEL[o.status] ?? o.status}</td>
                        <td className="px-3 py-2 text-gray-400">{formatDate(o.created_at)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-200">
                          {formatMoneyVietNam(Number(o.total_amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
