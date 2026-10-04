import { useState } from "react";
import { FileInput, Label, Textarea, TextInput } from "flowbite-react";
import { Pencil, Plus, Store as StoreIcon } from "lucide-react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { createStore, updateStore } from "../../services/seller.services";
import { notifyError, notifySuccess } from "../../helpers/notify";
import FormModal from "../../components/common/FormModal";
import { SellerStore } from "../../types/seller.types";

const STATUS_META: Record<SellerStore["status"], { label: string; className: string }> = {
  active: { label: "Đang hoạt động", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  inactive: { label: "Tạm ẩn", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  pending: { label: "Chờ admin duyệt", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
};

export default function SellerStores() {
  const { stores, activeStore, setActiveStore, refreshStores } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SellerStore | null>(null);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (store: SellerStore) => {
    setEditing(store);
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý gian hàng</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gian hàng mới cần admin duyệt trước khi hoạt động.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          <Plus className="size-4" /> Tạo gian hàng
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Bạn chưa có gian hàng nào. Bấm "Tạo gian hàng" để bắt đầu.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s) => {
            const active = s.id === activeStore?.id;
            const st = STATUS_META[s.status] ?? STATUS_META.pending;
            return (
              <div
                key={s.id}
                className={`rounded-xl border bg-white p-5 dark:bg-white/[0.03] ${
                  active ? "border-violet-500/60 ring-1 ring-violet-500/40" : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                    {s.logo ? (
                      <img src={s.logo} alt={s.name} className="size-11 rounded-xl object-cover" />
                    ) : (
                      <StoreIcon className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 grow">
                    <div className="truncate font-semibold text-gray-800 dark:text-white">{s.name}</div>
                    <div className="truncate text-xs text-gray-500 dark:text-gray-400">/{s.slug}</div>
                  </div>
                  <button
                    onClick={() => openEdit(s)}
                    title="Sửa gian hàng"
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-violet-600 dark:hover:bg-gray-700/50"
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>
                <p className="mt-3 line-clamp-2 min-h-[32px] text-sm text-gray-500 dark:text-gray-400">
                  {s.description || "Chưa có mô tả"}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${st.className}`}>
                    {st.label}
                  </span>
                  {active ? (
                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Đang quản lý</span>
                  ) : (
                    <button
                      onClick={() => setActiveStore(s)}
                      className="text-xs font-semibold text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400"
                    >
                      Chọn quản lý
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StoreFormModal
        open={open}
        store={editing}
        onClose={() => setOpen(false)}
        onSaved={async () => {
          setOpen(false);
          await refreshStores();
        }}
      />

      <ToastContainer />
    </div>
  );
}

function StoreFormModal({
  open,
  store,
  onClose,
  onSaved,
}: {
  open: boolean;
  store: SellerStore | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const isEdit = !!store;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const logo = form.get("logo");
    if (logo instanceof File && logo.size === 0) form.delete("logo");

    setSubmitting(true);
    setErrors({});
    try {
      if (store) {
        await updateStore(store.id, form);
        notifySuccess("Cập nhật gian hàng thành công");
      } else {
        await createStore(form);
        notifySuccess("Đã tạo gian hàng, đang chờ admin duyệt");
      }
      onSaved();
    } catch (err: any) {
      setErrors(err?.response?.data?.errors ?? {});
      notifyError(err?.response?.data?.message ?? "Lưu gian hàng thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa gian hàng" : "Tạo gian hàng"}
      onSubmit={handleSubmit}
      submitLabel={submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo gian hàng"}
      formKey={`${store?.id ?? "new"}-${open}`}
      size="md"
    >
      <div>
        <Label htmlFor="store-name">Tên gian hàng</Label>
        <TextInput id="store-name" name="name" required defaultValue={store?.name ?? ""} placeholder="TechZone" />
        {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name[0]}</p>}
      </div>
      <div>
        <Label htmlFor="store-desc">Mô tả</Label>
        <Textarea id="store-desc" name="description" rows={3} defaultValue={store?.description ?? ""} />
        {errors.description && <p className="mt-1 text-xs text-rose-500">{errors.description[0]}</p>}
      </div>
      <div>
        <Label htmlFor="store-logo">Logo (không bắt buộc)</Label>
        {store?.logo && (
          <img src={store.logo} alt={store.name} className="mb-2 mt-1 size-16 rounded-lg object-cover" />
        )}
        <FileInput id="store-logo" name="logo" accept="image/*" />
        {errors.logo && <p className="mt-1 text-xs text-rose-500">{errors.logo[0]}</p>}
        {!isEdit && (
          <p className="mt-1 text-xs text-gray-400">Gian hàng sẽ ở trạng thái chờ duyệt sau khi tạo.</p>
        )}
      </div>
    </FormModal>
  );
}
