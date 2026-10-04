import { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  FolderTree,
  Landmark,
  Loader2,
  Package,
  Percent,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Ticket,
  Trash2,
  User,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { getEmployeeDetail, updateEmployeePermissions } from "../../services/employee.services";
import type { EmployeeItem, PermissionModule } from "../../types/employee.types";

const MODULE_ICON: Record<string, typeof Package> = {
  products: Package,
  categories: FolderTree,
  brands: Tag,
  customers: UserRound,
  seller_applications: Store,
  stores: ShoppingBag,
  orders: ClipboardList,
  reviews: Star,
  commissions: Percent,
  vouchers: Ticket,
  withdrawals: Wallet,
  platform_funds: Landmark,
};

const SECTION_MAP: Record<string, string> = {
  products: "Quản lý",
  categories: "Quản lý",
  brands: "Quản lý",
  customers: "Quản lý",
  seller_applications: "Sàn TMĐT",
  stores: "Sàn TMĐT",
  orders: "Sàn TMĐT",
  reviews: "Sàn TMĐT",
  commissions: "Sàn TMĐT",
  vouchers: "Sàn TMĐT",
  withdrawals: "Sàn TMĐT",
  platform_funds: "Sàn TMĐT",
};

const ABILITY_META = {
  view: { label: "Xem", icon: Boxes, activeClass: "border-sky-500 bg-sky-500/15 text-sky-300" },
  create: { label: "Thêm", icon: Plus, activeClass: "border-emerald-500 bg-emerald-500/15 text-emerald-300" },
  edit: { label: "Sửa", icon: Pencil, activeClass: "border-amber-500 bg-amber-500/15 text-amber-300" },
  delete: { label: "Xóa", icon: Trash2, activeClass: "border-rose-500 bg-rose-500/15 text-rose-300" },
} as const;

type Ability = keyof typeof ABILITY_META;
type BoolField = "can_view" | "can_create" | "can_edit" | "can_delete";

interface Props {
  open: boolean;
  employee: EmployeeItem | null;
  onClose: () => void;
}

export default function PermissionMatrixModal({ open, employee, onClose }: Props) {
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!employee) return;
    setLoading(true);
    setLoadError(false);
    getEmployeeDetail(employee.id)
      .then((res) => setModules(res.data.permission_modules ?? []))
      .catch((err) => {
        console.error("Không tải được danh sách quyền:", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !employee) return;
    setModules([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id]);

  const toggle = (moduleKey: string, field: BoolField) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.key !== moduleKey) return m;
        const next = { ...m, [field]: !m[field] };
        if (field === "can_view" && !next.can_view) {
          next.can_create = false;
          next.can_edit = false;
          next.can_delete = false;
        }
        if (field !== "can_view" && next[field]) {
          next.can_view = true;
        }
        return next;
      }),
    );
  };

  const grantedCount = modules.filter((m) => m.can_view).length;

  const sections = useMemo(() => {
    const groups: Record<string, PermissionModule[]> = {};
    modules.forEach((m) => {
      const section = SECTION_MAP[m.key] ?? "Khác";
      (groups[section] ??= []).push(m);
    });
    return groups;
  }, [modules]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployeePermissions(
        employee.id,
        modules.map((m) => ({
          module: m.key,
          can_view: m.can_view,
          can_create: m.can_create,
          can_edit: m.can_edit,
          can_delete: m.can_delete,
        })),
      );
      notifySuccess("Đã cập nhật phân quyền");
      onClose();
    } catch (err) {
      console.error("Cập nhật phân quyền thất bại:", err);
      notifyError("Cập nhật phân quyền thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !employee) return null;

  return (
    <Modal show={open} size="4xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody className="max-h-[85vh] overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Phân quyền quản lý</h3>
                <p className="text-sm text-gray-400">
                  {employee.name} <span className="text-gray-600">·</span> @{employee.username}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
              <span className="text-sm">Đang tải danh sách quyền...</span>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 py-14 text-center">
              <AlertTriangle className="h-7 w-7 text-rose-400" />
              <p className="text-sm text-rose-300">Không tải được danh sách quyền. Vui lòng thử lại.</p>
              <button
                type="button"
                onClick={load}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-slate-700 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Thử lại
              </button>
            </div>
          )}

          {!loading && !loadError && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <User className="h-4 w-4 text-indigo-400" />
                  Đang được cấp quyền xem{" "}
                  <span className="font-semibold text-white">
                    {grantedCount}/{modules.length}
                  </span>{" "}
                  mục quản lý
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                  {(Object.keys(ABILITY_META) as Ability[]).map((ability) => {
                    const meta = ABILITY_META[ability];
                    const Icon = meta.icon;
                    return (
                      <span key={ability} className="flex items-center gap-1 text-xs text-gray-500">
                        <Icon className="h-3.5 w-3.5" /> {meta.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                {Object.entries(sections).map(([sectionName, sectionModules]) => (
                  <div key={sectionName}>
                    <h4 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <span className="h-px flex-1 bg-slate-800" />
                      {sectionName}
                      <span className="h-px flex-1 bg-slate-800" />
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {sectionModules.map((m) => {
                        const ModuleIcon = MODULE_ICON[m.key] ?? Package;
                        return (
                          <div
                            key={m.key}
                            className={`rounded-xl border p-3.5 transition-colors ${
                              m.can_view ? "border-indigo-500/30 bg-indigo-500/[0.06]" : "border-slate-800 bg-white/[0.015]"
                            }`}
                          >
                            <div className="mb-2.5 flex items-center gap-2">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  m.can_view ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-gray-500"
                                }`}
                              >
                                <ModuleIcon className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-semibold text-gray-100">{m.label}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(Object.keys(ABILITY_META) as Ability[])
                                .filter((ability) => m.abilities.includes(ability))
                                .map((ability) => {
                                  const meta = ABILITY_META[ability];
                                  const Icon = meta.icon;
                                  const field = `can_${ability}` as BoolField;
                                  const active = m[field];
                                  return (
                                    <button
                                      key={ability}
                                      type="button"
                                      onClick={() => toggle(m.key, field)}
                                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                        active
                                          ? meta.activeClass
                                          : "border-slate-700 bg-transparent text-gray-500 hover:border-slate-600 hover:text-gray-300"
                                      }`}
                                    >
                                      <Icon className="h-3.5 w-3.5" />
                                      {meta.label}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <p className="rounded-lg bg-slate-900/60 px-3.5 py-2.5 text-xs text-gray-500">
                Nhân viên mới tạo mặc định <span className="font-medium text-gray-400">không có quyền gì</span> — chỉ vào được
                các mục được bật "Xem" ở trên, kể cả khi gọi thẳng API (Postman...).
              </p>
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-slate-700 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={loading || loadError || saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu phân quyền
            </button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
