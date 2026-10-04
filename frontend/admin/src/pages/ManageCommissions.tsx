import { useEffect, useMemo, useState } from "react";
import { ToastContainer } from "react-toastify";
import { Button } from "flowbite-react";
import { notifyError, notifySuccess } from "../helpers/notify";
import {
  deleteCommission,
  getAdminStores,
  getCommissions,
  upsertCommission,
} from "../services/marketplace.services";
import { getAllCategories } from "../services/categories.services";
import DataTable, { Column } from "../components/common/DataTable";
import RowActions from "../components/common/RowActions";
import { confirmDelete } from "../helpers/confirmDelete";
import { useModulePermission } from "../hooks/useModulePermission";

interface Commission {
  id: number;
  scope: "default" | "category" | "store";
  category_id?: number | null;
  store_id?: number | null;
  rate: number | string;
  is_active: boolean;
  category?: { name: string };
  store?: { name: string };
}

const inputClass =
  "rounded-lg border border-gray-700 bg-[#0e1726] px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500";

export default function ManageCommissionsPage() {
  const [items, setItems] = useState<Commission[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [search, setSearch] = useState("");

  const [scope, setScope] = useState<"default" | "category" | "store">(
    "default",
  );
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [rate, setRate] = useState("10");
  const { canCreate, canDelete } = useModulePermission("commissions");

  const load = () => {
    getCommissions().then((res) => setItems(res?.data ?? []));
  };

  useEffect(() => {
    load();
    getAllCategories({ per_page: 100 }).then((r) => setCategories(r?.data ?? []));
    getAdminStores().then((r) => setStores(r?.data?.data ?? r?.data ?? []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertCommission({
        scope,
        category_id: scope === "category" ? Number(categoryId) : null,
        store_id: scope === "store" ? Number(storeId) : null,
        rate: Number(rate),
        is_active: true,
      });
      notifySuccess("Đã lưu cấu hình hoa hồng");
      load();
    } catch {
      notifyError("Lưu thất bại (kiểm tra chọn danh mục/gian hàng)");
    }
  };

  const handleDelete = (c: Commission) => {
    if (c.scope === "default") return;
    confirmDelete(() => deleteCommission(c.id), {
      title: "Xóa cấu hình hoa hồng này?",
      successText: "Đã xóa cấu hình",
    }).then((deleted) => {
      if (deleted) load();
    });
  };

  const label = (c: Commission) =>
    c.scope === "default"
      ? "Mặc định (toàn hệ thống)"
      : c.scope === "category"
        ? `Danh mục: ${c.category?.name ?? c.category_id}`
        : `Gian hàng: ${c.store?.name ?? c.store_id}`;

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((c) => label(c).toLowerCase().includes(kw));
  }, [items, search]);

  const columns: Column<Commission>[] = [
    {
      header: "Áp dụng cho",
      render: (c) => <span className="text-gray-200">{label(c)}</span>,
    },
    {
      header: "Tỉ lệ",
      render: (c) => (
        <span className="font-semibold text-gray-100">{Number(c.rate)}%</span>
      ),
    },
    {
      header: "Trạng thái",
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
      align: "center",
      render: (c) =>
        c.scope === "default" ? (
          <span className="text-xs text-gray-500">Mặc định</span>
        ) : (
          <RowActions onDelete={canDelete ? () => handleDelete(c) : undefined} />
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">
        Quản Lý Hoa Hồng
      </h2>

      {canCreate && (
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-400">Phạm vi</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className={inputClass}
          >
            <option value="default">Mặc định</option>
            <option value="category">Theo danh mục</option>
            <option value="store">Theo gian hàng</option>
          </select>
        </div>

        {scope === "category" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-400">Danh mục</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="">-- Chọn --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === "store" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-400">Gian hàng</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="">-- Chọn --</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-400">Tỉ lệ (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
            className={`${inputClass} w-28`}
          />
        </div>

        <Button type="submit" className="cursor-pointer">
          Lưu cấu hình
        </Button>
      </form>
      )}

      <DataTable
        title="Cấu Hình Hoa Hồng"
        subtitle="Tỉ lệ hoa hồng áp dụng theo mặc định, danh mục hoặc gian hàng."
        data={filtered}
        columns={columns}
        rowKey={(c) => c.id}
        totalItems={filtered.length}
        searchValue={search}
        onSearch={setSearch}
      />

      <ToastContainer />
    </div>
  );
}
