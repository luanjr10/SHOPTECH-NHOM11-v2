import { useCallback, useEffect, useState } from "react";
import { Button } from "flowbite-react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import {
  createStoreProduct,
  deleteStoreProduct,
  getStoreProducts,
  updateStoreProduct,
} from "../../services/seller.services";
import { getAllCategories } from "../../services/categories.services";
import { notifySuccess } from "../../helpers/notify";
import { confirmDelete } from "../../helpers/confirmDelete";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { formatDate } from "../../helpers/formatDate";
import DataTable, { Column } from "../../components/common/DataTable";
import SortSelect from "../../components/common/SortSelect";
import RowActions from "../../components/common/RowActions";
import ProductFormModal from "../../components/products/ProductFormModal";
import ProductDetailModal from "../../components/products/ProductDetailModal";
import { usePaginatedResource } from "../../hooks/usePaginatedResource";
import { CategoryItem } from "../../types/categories.types";
import { SellerProductItem } from "../../types/seller.types";
import { ProductSort } from "../../types/products.types";
import { SortOption } from "../../types/common.types";

const SORT_OPTIONS: SortOption<ProductSort>[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá: Thấp đến cao" },
  { value: "price_desc", label: "Giá: Cao đến thấp" },
  { value: "discount_desc", label: "Giảm giá nhiều nhất" },
];

export default function SellerProducts() {
  const { activeStore } = useAuth();
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const fetchProducts = useCallback(
    async (params: { page: number; sort: ProductSort; search?: string }) => {
      if (!activeStore) return { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } };
      return getStoreProducts(activeStore.id, params);
    },
    [activeStore],
  );

  const {
    items: products,
    meta,
    page,
    setPage,
    sort,
    setSort,
    search,
    setSearch,
    refetch,
  } = usePaginatedResource<SellerProductItem, ProductSort>(fetchProducts, "newest", activeStore?.id);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedProductId, setSelectedProductId] = useState<number>();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<number>();

  useEffect(() => {
    getAllCategories({ per_page: 100 }).then((res) => setCategories(res?.data || []));
  }, []);

  const openCreateModal = () => {
    setFormMode("create");
    setSelectedProductId(undefined);
    setFormOpen(true);
  };

  const openEditModal = (id: number) => {
    setFormMode("edit");
    setSelectedProductId(id);
    setFormOpen(true);
  };

  const openDetail = (id: number) => {
    setDetailProductId(id);
    setDetailOpen(true);
  };

  const handleDelete = (p: SellerProductItem) => {
    if (!activeStore) return;
    confirmDelete(() => deleteStoreProduct(activeStore.id, p.id), {
      title: `Xóa sản phẩm "${p.name}"?`,
    }).then((deleted) => {
      if (deleted) refetch();
    });
  };

  if (!activeStore) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sản phẩm</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Bạn chưa có gian hàng. Hãy tạo gian hàng trước khi thêm sản phẩm.
        </div>
      </div>
    );
  }

  const columns: Column<SellerProductItem>[] = [
    {
      header: "Sản phẩm",
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3.5">
          {p.thumbnail ? (
            <img
              src={p.thumbnail}
              alt={p.name}
              className="h-11 w-11 shrink-0 rounded-lg border border-gray-800 bg-[#0e1726] object-cover"
            />
          ) : (
            <div className="h-11 w-11 shrink-0 rounded-lg border border-gray-800 bg-[#0e1726]" />
          )}
          <span className="truncate max-w-xs font-semibold text-gray-200">{p.name}</span>
        </div>
      ),
    },
    { header: "Mã", render: (p) => <span className="font-mono text-gray-500 dark:text-gray-400">{p.code}</span> },
    {
      header: "Danh mục",
      render: (p) => (
        <span className="text-gray-300">
          {categories.find((c) => String(c.id) === String(p.category_id))?.name || "—"}
        </span>
      ),
    },
    {
      header: "Giá",
      render: (p) => {
        const hasDiscount = (p.discount_percent ?? 0) > 0;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-gray-200">{formatMoneyVietNam(Number(p.price))}</span>
            {hasDiscount && (
              <span className="text-[10px] font-semibold text-rose-400">-{p.discount_percent}%</span>
            )}
          </div>
        );
      },
    },
    { header: "Kho", render: (p) => p.stock },
    {
      header: "Trạng thái",
      render: (p) =>
        p.status === 1 ? (
          <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
            Đang bán
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400">
            Đang ẩn
          </span>
        ),
    },
    {
      header: "Ngày cập nhật",
      render: (p) => <span className="text-gray-400">{formatDate(p.updated_at || "")}</span>,
    },
    {
      header: "Thao tác",
      align: "center",
      render: (p) => (
        <RowActions
          onView={() => openDetail(p.id)}
          onEdit={() => openEditModal(p.id)}
          onDelete={() => handleDelete(p)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sản phẩm</h2>

      <DataTable
        title="Danh sách sản phẩm"
        subtitle={`Gian hàng: ${activeStore.name}`}
        data={products}
        columns={columns}
        rowKey={(p) => p.id}
        currentPage={page}
        totalPages={meta.last_page}
        totalItems={meta.total}
        onPageChange={setPage}
        searchValue={search}
        onSearch={setSearch}
        filters={<SortSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />}
        actionButton={
          <Button className="cursor-pointer" onClick={openCreateModal}>
            Thêm sản phẩm
          </Button>
        }
      />

      <ToastContainer />

      <ProductDetailModal
        open={detailOpen}
        productId={detailProductId}
        onClose={() => setDetailOpen(false)}
        categories={categories}
      />

      <ProductFormModal
        open={formOpen}
        mode={formMode}
        productId={selectedProductId}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          refetch();
          notifySuccess(formMode === "create" ? "Tạo sản phẩm thành công" : "Cập nhật sản phẩm thành công");
        }}
        submitCreate={(data) => createStoreProduct(activeStore.id, data)}
        submitUpdate={(id, data) => updateStoreProduct(activeStore.id, id, data)}
      />
    </div>
  );
}
