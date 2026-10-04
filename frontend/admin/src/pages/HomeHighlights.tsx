import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { Button } from "flowbite-react";
import { notifyError, notifySuccess } from "../helpers/notify";
import {
  getFlashSaleSetting,
  getHighlightProducts,
  updateFlashSaleSetting,
  updateProductHighlight,
} from "../services/homeHighlights.services";
import DataTable, { Column } from "../components/common/DataTable";
import AddHighlightProductModal from "../components/homeHighlights/AddHighlightProductModal";
import { useModulePermission } from "../hooks/useModulePermission";
import { formatMoneyVietNam } from "../helpers/formatMoney";

interface HighlightProduct {
  id: number;
  code: string;
  name: string;
  thumbnail: string | null;
  price: number | string;
  discount_percent: number;
  is_featured: boolean;
  is_flash_sale: boolean;
  brand?: string | null;
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 16).replace(" ", "T");
}

const inputClass =
  "rounded-lg border border-gray-700 bg-[#0e1726] px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500";

export default function HomeHighlightsPage() {
  const { canEdit } = useModulePermission("home_highlights");

  const [endsAt, setEndsAt] = useState("");
  const [savingSetting, setSavingSetting] = useState(false);

  const [tab, setTab] = useState<"flash_sale" | "featured">("flash_sale");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<HighlightProduct[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const [savingId, setSavingId] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    getFlashSaleSetting().then((res) =>
      setEndsAt(toDatetimeLocal(res?.data?.ends_at ?? null)),
    );
  }, []);

  const loadProducts = () => {
    getHighlightProducts({ search, highlight: tab, page, per_page: 10 }).then(
      (res) => {
        setItems(res?.data ?? []);
        setMeta({
          last_page: res?.meta?.last_page ?? 1,
          total: res?.meta?.total ?? 0,
        });
      },
    );
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, search]);

  const handleSaveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSetting(true);
    try {
      const value = endsAt ? endsAt.replace("T", " ") + ":00" : null;
      await updateFlashSaleSetting(value);
      notifySuccess("Đã cập nhật giờ kết thúc Flash sale");
    } catch {
      notifyError("Lưu thất bại");
    } finally {
      setSavingSetting(false);
    }
  };

  const toggleFlag = async (
    product: HighlightProduct,
    field: "is_featured" | "is_flash_sale",
  ) => {
    setSavingId(product.id);
    try {
      const res = await updateProductHighlight(product.id, {
        [field]: !product[field],
      });
      setItems((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, is_featured: res.data.is_featured, is_flash_sale: res.data.is_flash_sale }
            : p,
        ),
      );
      notifySuccess("Đã cập nhật");
    } catch {
      notifyError("Cập nhật thất bại");
    } finally {
      setSavingId(null);
    }
  };

  const columns: Column<HighlightProduct>[] = [
    {
      header: "Sản phẩm",
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.thumbnail ? (
            <img
              src={p.thumbnail}
              alt={p.name}
              className="h-10 w-10 rounded-lg object-contain bg-white"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gray-800" />
          )}
          <div>
            <p className="font-medium text-gray-100">{p.name}</p>
            <p className="text-xs text-gray-500">{p.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Giá",
      render: (p) => (
        <span className="text-gray-200">
          {formatMoneyVietNam(Number(p.price))}
          {p.discount_percent > 0 && (
            <span className="ml-1 text-xs text-emerald-400">
              -{p.discount_percent}%
            </span>
          )}
        </span>
      ),
    },
    {
      header: "Flash sale",
      align: "center",
      render: (p) => (
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={p.is_flash_sale}
            disabled={!canEdit || savingId === p.id}
            onChange={() => toggleFlag(p, "is_flash_sale")}
            className="h-4 w-4 rounded border-gray-700 bg-transparent text-primary500 focus:ring-0 cursor-pointer disabled:opacity-40"
          />
        </label>
      ),
    },
    {
      header: "Hot trend",
      align: "center",
      render: (p) => (
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={p.is_featured}
            disabled={!canEdit || savingId === p.id}
            onChange={() => toggleFlag(p, "is_featured")}
            className="h-4 w-4 rounded border-gray-700 bg-transparent text-primary500 focus:ring-0 cursor-pointer disabled:opacity-40"
          />
        </label>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="text-2xl font-bold text-white font-sans">
        Nổi Bật Trang Chủ
      </h2>

      {canEdit && (
        <form
          onSubmit={handleSaveSetting}
          className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-400">
              Kết thúc Flash sale (đếm ngược ở trang chủ)
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <Button type="submit" disabled={savingSetting} className="cursor-pointer">
            Lưu giờ kết thúc
          </Button>
          <p className="text-xs text-gray-500">
            Để trống + lưu nếu muốn ẩn khối Flash sale ở trang chủ.
          </p>
        </form>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setTab("flash_sale");
              setPage(1);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "flash_sale"
                ? "bg-primary500 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Sản phẩm Flash sale
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("featured");
              setPage(1);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "featured"
                ? "bg-primary500 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Sản phẩm Hot trend
          </button>
        </div>

        <DataTable
          title={tab === "flash_sale" ? "Đang thuộc Flash sale" : "Đang là Hot trend"}
          subtitle="Tick để hiển thị sản phẩm ở khối tương ứng trên trang chủ."
          data={items}
          columns={columns}
          rowKey={(p) => p.id}
          searchValue={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          currentPage={page}
          totalPages={meta.last_page}
          totalItems={meta.total}
          onPageChange={setPage}
          actionButton={
            canEdit ? (
              <Button
                onClick={() => setAddModalOpen(true)}
                className="cursor-pointer"
              >
                + Thêm sản phẩm
              </Button>
            ) : undefined
          }
        />
      </div>

      <AddHighlightProductModal
        open={addModalOpen}
        highlight={tab}
        onClose={() => setAddModalOpen(false)}
        onAdded={loadProducts}
      />

      <ToastContainer />
    </div>
  );
}
