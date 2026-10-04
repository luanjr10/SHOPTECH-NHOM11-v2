import { useEffect, useState } from "react";
import { Button } from "flowbite-react";
import { ToastContainer } from "react-toastify";
import DataTable, { Column } from "../common/DataTable";
import SortSelect from "../common/SortSelect";
import RowActions from "../common/RowActions";
import ProductFormModal from "./ProductFormModal";
import ProductDetailModal from "./ProductDetailModal";
import { usePaginatedResource } from "../../hooks/usePaginatedResource";
import { useModulePermission } from "../../hooks/useModulePermission";
import { confirmDelete } from "../../helpers/confirmDelete";
import { deleteProduct, getAllProducts } from "../../services/products.services";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { formatDate } from "../../helpers/formatDate";
import { CategoryItem } from "../../types/categories.types";
import { getAllCategories } from "../../services/categories.services";
import { ProductItem, ProductSort } from "../../types/products.types";
import { SortOption } from "../../types/common.types";

const SORT_OPTIONS: SortOption<ProductSort>[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá: Thấp đến cao" },
  { value: "price_desc", label: "Giá: Cao đến thấp" },
  { value: "discount_desc", label: "Giảm giá nhiều nhất" },
];

export default function ProductsList() {
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
  } = usePaginatedResource<ProductItem, ProductSort>(getAllProducts, "newest");

  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedProductId, setSelectedProductId] = useState<number>();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<number>();

  const { canCreate, canEdit, canDelete } = useModulePermission("products");

  useEffect(() => {
    getAllCategories({ per_page: 100 }).then((response) => {
      setCategories(response?.data || []);
    });
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

  const handleDeleteProduct = (id: number) => {
    confirmDelete(() => deleteProduct(id), {
      title: "Bạn Có Chắc Muốn Xóa Sản Phẩm Này?",
      successText: "Sản Phẩm Này Đã Được Xóa",
    }).then((deleted) => {
      if (deleted) refetch();
    });
  };

  const columns: Column<ProductItem>[] = [
    {
      header: "Sản phẩm",
      sortable: true,
      render: (product) => (
        <div className="flex min-w-0 items-center gap-3.5">
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-11 w-11 shrink-0 rounded-lg object-cover border border-gray-800 bg-[#0e1726]"
          />
          <span className="truncate max-w-xs font-semibold text-gray-200">
            {product.name}
          </span>
        </div>
      ),
    },
    {
      header: "Danh mục",
      sortable: true,
      render: (product) => (
        <span className="text-gray-300">
          {categories.find(
            (item) => String(item.id) === String(product.category_id),
          )?.name || "—"}
        </span>
      ),
    },
    {
      header: "Giá",
      sortable: true,
      render: (product) => {
        const hasDiscount = (product.discount_percent ?? 0) > 0;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-gray-200">
              {formatMoneyVietNam(product.final_price ?? product.price)}
            </span>
            {hasDiscount && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 line-through">
                  {formatMoneyVietNam(product.price)}
                </span>
                <span className="text-[10px] font-semibold text-rose-400">
                  -{product.discount_percent}%
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Trạng thái",
      render: (product) => {
        const inStock = product.stock > 0;
        return (
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              inStock
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {inStock ? "Còn hàng" : "Hết hàng"}
          </span>
        );
      },
    },
    {
      header: "Ngày cập nhật",
      render: (product) => (
        <span className="text-gray-400">
          {formatDate(product.updated_at || "")}
        </span>
      ),
    },
    {
      header: "Thao tác",
      align: "center",
      render: (product) => (
        <RowActions
          onView={() => openDetail(product.id!)}
          onEdit={canEdit ? () => openEditModal(product.id!) : undefined}
          onDelete={canDelete ? () => handleDeleteProduct(product.id!) : undefined}
        />
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Danh Sách Sản Phẩm"
        subtitle="Theo dõi và quản lý toàn bộ sản phẩm trong kho."
        data={products}
        columns={columns}
        rowKey={(item) => item.id!}
        currentPage={page}
        totalPages={meta.last_page}
        totalItems={meta.total}
        onPageChange={setPage}
        searchValue={search}
        onSearch={setSearch}
        filters={
          <SortSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />
        }
        actionButton={
          canCreate ? (
            <Button onClick={openCreateModal} className="cursor-pointer">
              Thêm Sản Phẩm
            </Button>
          ) : undefined
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
        onSaved={refetch}
      />
    </>
  );
}
