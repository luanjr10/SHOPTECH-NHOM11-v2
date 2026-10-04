import { useEffect, useRef, useState } from "react";
import { Eye, ShieldCheck, SquarePen, Trash, User, X } from "lucide-react";
import { ToastContainer } from "react-toastify";
import Swal from "sweetalert2";
import { Button, Label, Modal, ModalBody, ModalHeader, TextInput } from "flowbite-react";
import DataTable, { Column } from "../common/DataTable";
import { formatDate } from "../../helpers/formatDate";
import { notifyError, notifySuccess } from "../../helpers/notify";
import {
  createEmployee,
  deleteEmployee,
  getEmployeeDetail,
  getEmployees,
  updateEmployee,
  type EmployeePayload,
} from "../../services/employee.services";
import type { EmployeeDetail, EmployeeItem } from "../../types/employee.types";
import EmployeeDetailModal from "./EmployeeDetailModal";
import PermissionMatrixModal from "./PermissionMatrixModal";

const emptyForm: EmployeePayload = { name: "", username: "", email: "", phone: "" };

export default function EmployeeList() {
  const [items, setItems] = useState<EmployeeItem[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeePayload>(emptyForm);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [permissionTarget, setPermissionTarget] = useState<EmployeeItem | null>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);

  const load = () => {
    getEmployees({ search: search || undefined, page: currentPage })
      .then((res) => {
        const page = res?.data;
        setItems(page?.data ?? []);
        setTotalPages(page?.last_page ?? 1);
        setTotalItems(page?.total ?? 0);
      })
      .catch(() => notifyError("Không tải được danh sách nhân viên"));
  };

  useEffect(load, [search, currentPage]);

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setOpenModal(true);
  };

  const openEdit = (e: EmployeeItem) => {
    setMode("edit");
    setEditingId(e.id);
    setForm({ name: e.name, username: e.username, email: e.email, phone: e.phone ?? "" });
    setOpenModal(true);
  };

  const openDetail = async (id: number) => {
    try {
      const res = await getEmployeeDetail(id);
      setDetail(res.data);
      setDetailOpen(true);
    } catch {
      notifyError("Không tải được chi tiết nhân viên");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        await createEmployee(form);
        notifySuccess("Đã tạo nhân viên — mật khẩu mặc định: password");
      } else if (editingId) {
        await updateEmployee(editingId, form);
        notifySuccess("Đã cập nhật nhân viên");
      }
      setOpenModal(false);
      load();
    } catch (err: any) {
      const message = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(", ")
        : (err?.response?.data?.message ?? "Lưu nhân viên thất bại");
      notifyError(message);
    }
  };

  const handleDelete = (e: EmployeeItem) => {
    Swal.fire({
      title: `Xóa nhân viên ${e.name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#3085d6",
      cancelButtonText: "Hủy bỏ",
      confirmButtonText: "Xóa",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await deleteEmployee(e.id);
        notifySuccess("Đã xóa nhân viên");
        load();
      } catch (err: any) {
        notifyError(err?.response?.data?.message ?? "Xóa nhân viên thất bại");
      }
    });
  };

  const columns: Column<EmployeeItem>[] = [
    {
      header: "Nhân viên",
      render: (e) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/15 text-indigo-400">
            {e.avatar_url ? (
              <img src={e.avatar_url} alt={e.name} className="h-9 w-9 object-cover" />
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-gray-200">{e.name}</div>
            <div className="text-xs text-gray-500">@{e.username}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Liên hệ",
      render: (e) => (
        <div>
          <div className="text-gray-300">{e.email}</div>
          <div className="text-xs text-gray-500">{e.phone ?? "—"}</div>
        </div>
      ),
    },
    {
      header: "Ngày tạo",
      render: (e) => <span className="whitespace-nowrap text-xs text-gray-400">{formatDate(e.created_at)}</span>,
    },
    {
      header: "Thao tác",
      align: "right",
      render: (e) => (
        <div className="inline-flex items-center space-x-2 text-slate-400">
          <button
            className="cursor-pointer p-1 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            title="Xem chi tiết"
            onClick={() => openDetail(e.id)}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className="cursor-pointer p-1 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
            title="Phân quyền"
            onClick={() => {
              setPermissionTarget(e);
              setPermissionOpen(true);
            }}
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
          <button
            className="cursor-pointer p-1 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
            title="Chỉnh sửa"
            onClick={() => openEdit(e)}
          >
            <SquarePen className="w-4 h-4" />
          </button>
          <button
            className="cursor-pointer p-1 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            title="Xóa"
            onClick={() => handleDelete(e)}
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Danh Sách Nhân Viên"
        subtitle="Nhân viên đăng nhập vào trang quản trị — quyền truy cập từng mục do bạn phân, xem nút Phân quyền."
        data={items}
        columns={columns}
        rowKey={(e) => e.id}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        searchValue={search}
        onSearch={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        actionButton={
          <Button onClick={openCreate} className="cursor-pointer">
            + Thêm Nhân Viên
          </Button>
        }
      />

      <ToastContainer />

      <Modal show={openModal} size="lg" popup onClose={() => setOpenModal(false)} initialFocus={nameInputRef}>
        <ModalHeader />
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div className="flex flex-row items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-xl font-semibold text-white">
                  {mode === "create" ? "Thêm Nhân Viên Mới" : "Chỉnh Sửa Nhân Viên"}
                </h3>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 cursor-pointer"
                  onClick={() => setOpenModal(false)}
                >
                  <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
                </button>
              </div>

              <div>
                <div className="mb-2 block">
                  <Label htmlFor="emp-name">Họ và tên</Label>
                </div>
                <TextInput
                  id="emp-name"
                  ref={nameInputRef}
                  required
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="emp-username">Tên đăng nhập</Label>
                  </div>
                  <TextInput
                    id="emp-username"
                    required
                    placeholder="nhanvien01"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="emp-phone">Số điện thoại</Label>
                  </div>
                  <TextInput
                    id="emp-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="09xxxxxxxx"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                    }
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 block">
                  <Label htmlFor="emp-email">Email</Label>
                </div>
                <TextInput
                  id="emp-email"
                  type="email"
                  required
                  placeholder="nhanvien@shoptech.vn"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              {mode === "create" && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                  Mật khẩu đăng nhập mặc định là <strong>password</strong> — nhân viên tự đổi sau khi đăng nhập.
                </p>
              )}

              <div className="flex flex-row gap-2 items-center justify-end">
                <Button className="w-30 cursor-pointer" type="submit">
                  {mode === "create" ? "Thêm Mới" : "Lưu Thay Đổi"}
                </Button>
                <Button onClick={() => setOpenModal(false)} className="w-30 cursor-pointer transition duration-150 ease-in-out">
                  Hủy Bỏ
                </Button>
              </div>
            </div>
          </form>
        </ModalBody>
      </Modal>

      <EmployeeDetailModal open={detailOpen} employee={detail} onClose={() => setDetailOpen(false)} />

      <PermissionMatrixModal
        open={permissionOpen}
        employee={permissionTarget}
        onClose={() => {
          setPermissionOpen(false);
          setPermissionTarget(null);
        }}
      />
    </>
  );
}
