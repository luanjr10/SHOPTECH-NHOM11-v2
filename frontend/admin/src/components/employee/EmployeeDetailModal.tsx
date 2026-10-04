import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { Calendar, CheckCircle2, Mail, Phone, User, X, XCircle } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import type { EmployeeDetail } from "../../types/employee.types";

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
  employee: EmployeeDetail | null;
  onClose: () => void;
}

export default function EmployeeDetailModal({ open, employee, onClose }: Props) {
  if (!employee) return null;

  const grantedModules = employee.permission_modules.filter((m) => m.can_view);

  return (
    <Modal show={open} size="xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-semibold text-white">Chi tiết nhân viên</h3>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 cursor-pointer"
              onClick={onClose}
            >
              <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-white/[0.02] p-4">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-indigo-500/15 text-indigo-400">
              {employee.avatar_url ? (
                <img src={employee.avatar_url} alt={employee.name} className="h-11 w-11 object-cover" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="font-semibold text-gray-100">{employee.name}</div>
              <div className="text-xs text-gray-500">@{employee.username}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow icon={Mail} label="Email" value={employee.email} />
            <DetailRow icon={Phone} label="Số điện thoại" value={employee.phone} />
            <DetailRow icon={Calendar} label="Ngày tạo" value={employee.created_at ? formatDate(employee.created_at) : "—"} />
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Đang được cấp quyền xem</div>
            {grantedModules.length === 0 ? (
              <p className="flex items-center gap-1.5 text-sm text-gray-500">
                <XCircle className="h-4 w-4" /> Chưa có quyền truy cập mục quản lý nào.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {grantedModules.map((m) => (
                  <span
                    key={m.key}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
                  >
                    <CheckCircle2 className="h-3 w-3" /> {m.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
