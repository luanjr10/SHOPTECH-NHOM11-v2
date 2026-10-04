import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { Calendar, MapPin, Package, Phone, Store as StoreIcon, User, X } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";

export interface StoreDetail {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  status: "active" | "inactive" | "pending";
  products_count?: number;
  pickup_contact_name?: string | null;
  pickup_phone?: string | null;
  address_line?: string | null;
  ward_name?: string | null;
  district_name?: string | null;
  province_name?: string | null;
  created_at?: string;
  seller_profile?: { user?: { name: string; username: string; email?: string } };
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ duyệt", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  active: { label: "Đang hoạt động", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  inactive: { label: "Đã ẩn", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
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
  store: StoreDetail | null;
  onClose: () => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onDeactivate?: (id: number) => void;
  onActivate?: (id: number) => void;
}

export default function StoreDetailModal({ open, store, onClose, onApprove, onReject, onDeactivate, onActivate }: Props) {
  if (!store) return null;

  const meta = STATUS_META[store.status] ?? STATUS_META.inactive;
  const pickupAddress = [store.address_line, store.ward_name, store.district_name, store.province_name]
    .filter(Boolean)
    .join(", ");

  return (
    <Modal show={open} size="2xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-semibold text-white">Chi tiết gian hàng</h3>
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
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="h-11 w-11 object-cover" />
                ) : (
                  <StoreIcon className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-100">{store.name}</div>
                <div className="text-xs text-gray-500">/{store.slug}</div>
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
              {meta.label}
            </span>
          </div>

          {store.description && (
            <p className="rounded-lg border border-slate-800 bg-white/[0.02] p-3 text-sm text-gray-300">
              {store.description}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow
              icon={User}
              label="Chủ gian hàng"
              value={
                store.seller_profile?.user
                  ? `${store.seller_profile.user.name} (@${store.seller_profile.user.username})`
                  : "—"
              }
            />
            <DetailRow icon={Package} label="Số sản phẩm" value={store.products_count ?? 0} />
            <DetailRow icon={Phone} label="SĐT lấy hàng" value={store.pickup_phone} />
            <DetailRow icon={Calendar} label="Ngày tạo" value={store.created_at ? formatDate(store.created_at) : "—"} />
          </div>

          <DetailRow
            icon={MapPin}
            label={`Địa chỉ lấy hàng${store.pickup_contact_name ? ` — ${store.pickup_contact_name}` : ""}`}
            value={pickupAddress || "Chưa cấu hình"}
          />

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            {store.status === "pending" && onApprove && onReject && (
              <>
                <button
                  type="button"
                  onClick={() => onApprove(store.id)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 cursor-pointer"
                >
                  Duyệt
                </button>
                <button
                  type="button"
                  onClick={() => onReject(store.id)}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 cursor-pointer"
                >
                  Từ chối
                </button>
              </>
            )}
            {store.status === "active" && onDeactivate && (
              <button
                type="button"
                onClick={() => onDeactivate(store.id)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600 cursor-pointer"
              >
                Tạm ẩn
              </button>
            )}
            {store.status === "inactive" && onActivate && (
              <button
                type="button"
                onClick={() => onActivate(store.id)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 cursor-pointer"
              >
                Kích hoạt
              </button>
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
