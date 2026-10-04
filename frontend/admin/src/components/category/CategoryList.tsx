import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Folder } from "lucide-react";
import { Button } from "flowbite-react";
import { ToastContainer } from "react-toastify";
import DataTable, { Column } from "../common/DataTable";
import SortSelect from "../common/SortSelect";
import RowActions from "../common/RowActions";
import CategoryFormModal from "./CategoryFormModal";
import UseCaseManagerModal from "./UseCaseManagerModal";
import { usePaginatedResource } from "../../hooks/usePaginatedResource";
import { useModulePermission } from "../../hooks/useModulePermission";
import { confirmDelete } from "../../helpers/confirmDelete";
import { formatDate } from "../../helpers/formatDate";
import { truncateText } from "../../helpers/truncateText";
import { deleteCategory, getAllCategories } from "../../services/categories.services";
import { CategoryItem, CategorySort } from "../../types/categories.types";
import { SortOption } from "../../types/common.types";

const SORT_OPTIONS: SortOption<CategorySort>[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "name_asc", label: "Tên: A đến Z" },
  { value: "name_desc", label: "Tên: Z đến A" },
];

export default function CategoriesList() {
  const {
    items: categories,
    meta,
    page,
    setPage,
    sort,
    setSort,
    search,
    setSearch,
    refetch,
  } = usePaginatedResource<CategoryItem, CategorySort>(getAllCategories, "newest");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>();

  const [useCaseOpen, setUseCaseOpen] = useState(false);
  const [useCaseCategory, setUseCaseCategory] = useState<CategoryItem>();

  const { canCreate, canEdit, canDelete } = useModulePermission("categories");

  const openUseCaseManager = (category: CategoryItem) => {
    setUseCaseCategory(category);
    setUseCaseOpen(true);
  };

  const openCreateModal = () => {
    setFormMode("create");
    setSelectedCategoryId(undefined);
    setFormOpen(true);
  };

  const openEditModal = (id: number) => {
    setFormMode("edit");
    setSelectedCategoryId(id);
    setFormOpen(true);
  };

  const handleDeleteCategory = (id: number) => {
    confirmDelete(() => deleteCategory(id), {
      title: "Bạn Có Chắc Muốn Xóa Danh Mục Này?",
      successText: "Danh Mục Này Đã Được Xóa",
    }).then((deleted) => {
      if (deleted) refetch();
    });
  };

  const columns: Column<CategoryItem>[] = [
    {
      header: "DANH MỤC",
      sortable: true,
      render: (category) => {
        const color = category.color || "#6366f1";

        const visual =
          category.display_type === "image" && category.image ? (
            <img
              src={category.image}
              alt={category.name}
              className="h-11 w-11 shrink-0 rounded-xl border border-slate-700 object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            (() => {
              const cleanIconName = category.icon?.trim() || "";
              const IconComponent =
                (LucideIcons as Record<string, any>)[cleanIconName] || Folder;
              return (
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                  style={{
                    color,
                    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                    borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
                  }}
                >
                  <IconComponent className="w-5 h-5" strokeWidth={1.8} />
                </div>
              );
            })()
          );

        return (
          <div className="flex min-w-0 items-center space-x-3.5 group">
            {visual}

            <div className="min-w-0 max-w-xs">
              <div className="flex items-center gap-1.5 truncate font-semibold text-gray-200 group-hover:text-indigo-400 transition-colors">
                {category.parent_id && (
                  <span className="text-slate-600">↳</span>
                )}
                {category.name}
              </div>
              <div className="truncate text-xs text-gray-500">
                {category.parent?.name
                  ? `Thuộc: ${category.parent.name}`
                  : truncateText(category.description, 12)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: "DANH MỤC CON",
      align: "center",
      render: (category) =>
        !category.children_count ? (
          <span className="text-xs text-slate-600">—</span>
        ) : (
          <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            {category.children_count} danh mục con
          </span>
        ),
    },
    {
      header: "MÃ DANH MỤC",
      sortable: true,
      render: (category) => (
        <span className="font-mono font-medium text-gray-300">
          {category.code}
        </span>
      ),
    },
    {
      header: "ĐƯỜNG DẪN (SLUG)",
      render: (category) => <span className="text-gray-400">{category.slug}</span>,
    },
    {
      header: "SỐ LƯỢNG SẢN PHẨM",
      align: "center",
      render: (category) => (
        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
          {category.products_count ?? 0} sản phẩm
        </span>
      ),
    },
    {
      header: "TRẠNG THÁI",
      align: "center",
      render: (category) => {
        const active = category.status === 1;
        return (
          <div className="flex justify-center">
            <span
              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/20"
              }`}
            >
              {active ? "Đang hiển thị" : "Đang ẩn"}
            </span>
          </div>
        );
      },
    },
    {
      header: "NGÀY TẠO",
      render: (category) => (
        <span className="text-gray-400 whitespace-nowrap">
          {formatDate(category.created_at)}
        </span>
      ),
    },
    {
      header: "THAO TÁC",
      align: "right",
      render: (category) => (
        <RowActions
          onManage={canEdit ? () => openUseCaseManager(category) : undefined}
          manageTitle="Quản lý Quick Link"
          onEdit={canEdit ? () => openEditModal(category.id) : undefined}
          onDelete={canDelete ? () => handleDeleteCategory(category.id) : undefined}
        />
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Danh Sách Danh Mục"
        subtitle="Quản lý và tổ chức cấu trúc phân loại sản phẩm trong hệ thống cửa hàng."
        data={categories}
        columns={columns}
        rowKey={(item) => item.id}
        currentPage={page}
        totalPages={meta.last_page}
        totalItems={meta.total}
        onPageChange={setPage}
        searchValue={search}
        onSearch={setSearch}
        filters={<SortSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />}
        actionButton={
          canCreate ? (
            <Button onClick={openCreateModal} className="cursor-pointer">
              + Thêm Danh Mục
            </Button>
          ) : undefined
        }
      />
      <ToastContainer />

      <CategoryFormModal
        open={formOpen}
        mode={formMode}
        categoryId={selectedCategoryId}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />

      <UseCaseManagerModal
        open={useCaseOpen}
        categoryId={useCaseCategory?.id}
        categoryName={useCaseCategory?.name}
        onClose={() => setUseCaseOpen(false)}
      />
    </>
  );
}
