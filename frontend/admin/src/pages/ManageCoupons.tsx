import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ToastContainer } from "react-toastify";
import Swal from "sweetalert2";
import { Button, Label, Modal, ModalBody, ModalHeader, TextInput } from "flowbite-react";
import DataTable, { Column } from "../components/common/DataTable";
import RowActions from "../components/common/RowActions";
import { formatDate } from "../helpers/formatDate";
import { formatMoneyVietNam } from "../helpers/formatMoney";
import { notifyError, notifySuccess } from "../helpers/notify";
import {
  Coupon,
  CouponPayload,
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from "../services/coupon.services";
import TierBadge from "../components/customer/TierBadge";
import { useModulePermission } from "../hooks/useModulePermission";

const TYPE_LABEL: Record<string, string> = {
  percent: "Giảm theo %",
  fixed: "Giảm số tiền cố định",
  free_ship: "Miễn phí vận chuyển",
};

const TIER_OPTIONS = [
  { value: "", label: "Tất cả hạng khách hàng" },
  { value: "bac", label: "Bạc trở lên" },
  { value: "vang", label: "Vàng trở lên" },
  { value: "kim_cuong", label: "Kim Cương" },
];

const emptyForm: CouponPayload = {
  code: "",
  title: "",
  description: "",
  type: "percent",
  target_tier: "",
  value: 0,
  max_discount: undefined,
  min_order_amount: 0,
  usage_limit: undefined,
  per_user_limit: undefined,
  expires_at: "",
  is_active: true,
};

export default function ManageCouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CouponPayload>(emptyForm);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const { canCreate, canEdit, canDelete } = useModulePermission("vouchers");

  const load = () => {
    getCoupons({ search: search || undefined, page: currentPage })
      .then((res) => {
        const page = res?.data;
        setItems(page?.data ?? []);
        setTotalPages(page?.last_page ?? 1);
        setTotalItems(page?.total ?? 0);
      })
      .catch(() => notifyError("Không tải được danh sách voucher"));
  };

  useEffect(load, [search, currentPage]);

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setOpenModal(true);
  };

  const openEdit = (c: Coupon) => {
    setMode("edit");
    setEditingId(c.id);
    setForm({
      code: c.code,
      title: c.title ?? "",
      description: c.description ?? "",
      type: c.type,
      target_tier: c.target_tier ?? "",
      value: Number(c.value ?? 0),
      max_discount: c.max_discount != null ? Number(c.max_discount) : undefined,
      min_order_amount: Number(c.min_order_amount ?? 0),
      usage_limit: c.usage_limit ?? undefined,
      per_user_limit: c.per_user_limit ?? undefined,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      is_active: c.is_active,
    });
    setOpenModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CouponPayload = {
      ...form,
      target_tier: form.target_tier || null,
      expires_at: form.expires_at || null,
      max_discount: form.max_discount || null,
      usage_limit: form.usage_limit || null,
      per_user_limit: form.per_user_limit || null,
    };

    try {
      if (mode === "create") {
        await createCoupon(payload);
        notifySuccess("Đã tạo voucher");
      } else if (editingId) {
        await updateCoupon(editingId, payload);
        notifySuccess("Đã cập nhật voucher");
      }
      setOpenModal(false);
      load();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Lưu voucher thất bại");
    }
  };

  const handleDelete = (c: Coupon) => {
    Swal.fire({
      title: `Xoá voucher ${c.code}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      cancelButtonText: "Hủy bỏ",
      confirmButtonText: "Đồng ý",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await deleteCoupon(c.id);
        notifySuccess("Đã xoá voucher");
        load();
      } catch {
        notifyError("Xoá voucher thất bại");
      }
    });
  };

  const isFreeShip = form.type === "free_ship";

  const columns: Column<Coupon>[] = [
    {
      header: "Voucher",
      render: (c) => (
        <div className="min-w-0">
          <div className="font-mono font-semibold text-indigo-400">{c.code}</div>
          <div className="truncate text-xs text-gray-500">{c.title ?? "—"}</div>
        </div>
      ),
    },
    {
      header: "Loại",
      render: (c) => (
        <span className="text-gray-300">
          {TYPE_LABEL[c.type] ?? c.type}
          {c.type === "percent" && ` (${Number(c.value)}%)`}
          {c.type === "fixed" && ` (${formatMoneyVietNam(Number(c.value))})`}
        </span>
      ),
    },
    {
      header: "Áp dụng cho hạng",
      align: "center",
      render: (c) =>
        c.target_tier ? (
          <TierBadge tier={c.target_tier} />
        ) : (
          <span className="text-xs text-gray-500">Mọi khách hàng</span>
        ),
    },
    {
      header: "Đã dùng / Giới hạn",
      align: "center",
      render: (c) => (
        <span className="text-gray-300">
          {c.used_count}
          {c.usage_limit ? ` / ${c.usage_limit}` : ""}
          {c.per_user_limit ? ` (tối đa ${c.per_user_limit}/khách)` : ""}
        </span>
      ),
    },
    {
      header: "Hết hạn",
      render: (c) => (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {c.expires_at ? formatDate(c.expires_at) : "Không giới hạn"}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      align: "center",
      render: (c) => (
        <span
          className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            c.is_active
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-slate-500/20 bg-slate-500/10 text-slate-400"
          }`}
        >
          {c.is_active ? "Đang áp dụng" : "Tắt"}
        </span>
      ),
    },
    {
      header: "Thao tác",
      align: "right",
      render: (c) => (
        <RowActions
          onEdit={canEdit ? () => openEdit(c) : undefined}
          onDelete={canDelete ? () => handleDelete(c) : undefined}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">Quản Lý Voucher</h2>

      <DataTable
        title="Danh Sách Voucher"
        subtitle="Voucher công khai và voucher hạng thành viên — khách hạng đủ điều kiện có thể bấm Nhận và áp dụng lúc thanh toán."
        data={items}
        columns={columns}
        rowKey={(c) => c.id}
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
          canCreate ? (
            <Button onClick={openCreate} className="cursor-pointer">
              + Tạo Voucher
            </Button>
          ) : undefined
        }
      />

      <ToastContainer />

      <Modal show={openModal} size="2xl" popup onClose={() => setOpenModal(false)} initialFocus={codeInputRef}>
        <ModalHeader />
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div className="flex flex-row items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-xl font-semibold text-white">
                  {mode === "create" ? "Tạo Voucher Mới" : "Chỉnh Sửa Voucher"}
                </h3>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 cursor-pointer"
                  onClick={() => setOpenModal(false)}
                >
                  <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="code">Mã voucher</Label>
                  </div>
                  <TextInput
                    id="code"
                    ref={codeInputRef}
                    required
                    placeholder="FREESHIP-BAC"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="title">Tên hiển thị</Label>
                  </div>
                  <TextInput
                    id="title"
                    placeholder="Miễn phí vận chuyển hạng Bạc"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 block">
                  <Label htmlFor="description">Mô tả</Label>
                </div>
                <TextInput
                  id="description"
                  placeholder="Mô tả ngắn hiển thị cho khách hàng"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="type">Loại voucher</Label>
                  </div>
                  <select
                    id="type"
                    className="w-full rounded-lg border border-gray-700 bg-[#0e1726] px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as CouponPayload["type"] })}
                  >
                    <option value="percent">Giảm theo %</option>
                    <option value="fixed">Giảm số tiền cố định</option>
                    <option value="free_ship">Miễn phí vận chuyển</option>
                  </select>
                </div>
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="target_tier">Áp dụng cho hạng khách hàng</Label>
                  </div>
                  <select
                    id="target_tier"
                    className="w-full rounded-lg border border-gray-700 bg-[#0e1726] px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    value={form.target_tier ?? ""}
                    onChange={(e) => setForm({ ...form, target_tier: e.target.value })}
                  >
                    {TIER_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    VD: khách đã mua trên 10 triệu (hạng Bạc) sẽ thấy và nhận được voucher này.
                  </p>
                </div>
              </div>

              {!isFreeShip && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 block">
                      <Label htmlFor="value">
                        {form.type === "percent" ? "Giá trị giảm (%)" : "Số tiền giảm (đ)"}
                      </Label>
                    </div>
                    <TextInput
                      id="value"
                      type="number"
                      min={0}
                      required
                      value={form.value ?? 0}
                      onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    />
                  </div>
                  {form.type === "percent" && (
                    <div>
                      <div className="mb-2 block">
                        <Label htmlFor="max_discount">Giảm tối đa (đ)</Label>
                      </div>
                      <TextInput
                        id="max_discount"
                        type="number"
                        min={0}
                        placeholder="Không giới hạn"
                        value={form.max_discount ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, max_discount: e.target.value ? Number(e.target.value) : undefined })
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {isFreeShip && (
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="max_discount_ship">Mức miễn phí ship tối đa (đ)</Label>
                  </div>
                  <TextInput
                    id="max_discount_ship"
                    type="number"
                    min={0}
                    placeholder="Miễn phí toàn bộ phí ship"
                    value={form.max_discount ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, max_discount: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="min_order_amount">Đơn tối thiểu (đ)</Label>
                  </div>
                  <TextInput
                    id="min_order_amount"
                    type="number"
                    min={0}
                    value={form.min_order_amount ?? 0}
                    onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="usage_limit">Tổng lượt dùng</Label>
                  </div>
                  <TextInput
                    id="usage_limit"
                    type="number"
                    min={1}
                    placeholder="Không giới hạn"
                    value={form.usage_limit ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </div>
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="per_user_limit">Lượt / khách</Label>
                  </div>
                  <TextInput
                    id="per_user_limit"
                    type="number"
                    min={1}
                    placeholder="VD: 3 lần"
                    value={form.per_user_limit ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, per_user_limit: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 block">
                    <Label htmlFor="expires_at">Ngày hết hạn</Label>
                  </div>
                  <TextInput
                    id="expires_at"
                    type="date"
                    value={form.expires_at ?? ""}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0b1120]/60 p-4">
                  <label className="text-sm font-semibold text-slate-200 cursor-pointer" htmlFor="is_active">
                    Kích hoạt voucher
                  </label>
                  <button
                    id="is_active"
                    type="button"
                    role="switch"
                    aria-checked={!!form.is_active}
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      form.is_active ? "bg-indigo-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        form.is_active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex flex-row gap-2 items-center justify-end pt-2">
                <Button className="w-32 cursor-pointer" type="submit">
                  {mode === "create" ? "Tạo Voucher" : "Lưu Thay Đổi"}
                </Button>
                <Button
                  onClick={() => setOpenModal(false)}
                  className="w-32 cursor-pointer transition duration-150 ease-in-out"
                >
                  Hủy Bỏ
                </Button>
              </div>
            </div>
          </form>
        </ModalBody>
      </Modal>
    </div>
  );
}
