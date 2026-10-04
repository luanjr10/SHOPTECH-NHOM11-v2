import { useState } from "react";
import { Button } from "flowbite-react";
import { ToastContainer } from "react-toastify";
import DataTable, { Column } from "../common/DataTable";
import SortSelect from "../common/SortSelect";
import RowActions from "../common/RowActions";
import { usePaginatedResource } from "../../hooks/usePaginatedResource";
import { useModulePermission } from "../../hooks/useModulePermission";
import { confirmDelete } from "../../helpers/confirmDelete";
import { formatDate } from "../../helpers/formatDate";
import { truncateText } from "../../helpers/truncateText";
import { SortOption } from "../../types/common.types";
import { deleteBrand, getAllBrands } from "../../services/brands.services";
import { BrandItem, BrandSort } from "../../types/brands.types";
import BrandFormModal from "./BrandFormModal";

const SORT_OPTIONS: SortOption<BrandSort>[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "name_asc", label: "Tên: A đến Z" },
  { value: "name_desc", label: "Tên: Z đến A" },
];

export default function BrandList() {
  const {
    items: brands,
    meta,
    page,
    setPage,
    sort,
    setSort,
    search,
    setSearch,
    refetch,
  } = usePaginatedResource<BrandItem, BrandSort>(getAllBrands, "newest");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedBrandId, setSelectedBrandId] = useState<number>();

  const { canCreate, canEdit, canDelete } = useModulePermission("brands");

  const openCreateModal = () => {
    setFormMode("create");
    setSelectedBrandId(undefined);
    setFormOpen(true);
  };

  const openEditModal = (id: number) => {
    setFormMode("edit");
    setSelectedBrandId(id);
    setFormOpen(true);
  };

  const handleDeleteBrand = (id: number) => {
    confirmDelete(() => deleteBrand(id), {
      title: "Bạn Có Chắc Muốn Xóa Thương Hiệu Này?",
      successText: "Thương Hiệu Này Đã Được Xóa",
    }).then((deleted) => {
      if (deleted) refetch();
    });
  };

  const columns: Column<BrandItem>[] = [
    {
      header: "THƯƠNG HIỆU",
      sortable: true,
      render: (brand) => (
        <div className="flex min-w-0 items-center gap-3.5">
          <img
            src={brand.logo}
            alt={brand.name}
            className="h-11 w-11 shrink-0 rounded-lg object-cover border border-gray-800 bg-[#0e1726]"
          />
          <span className="truncate max-w-xs font-semibold text-gray-200">
            {brand.name}
          </span>
        </div>
      ),
    },
    {
      header: "MÃ THƯƠNG HIỆU",
      sortable: true,
      render: (brand) => (
        <span className="font-mono font-medium text-gray-300">
          {brand.code}
        </span>
      ),
    },
    {
      header: "ĐƯỜNG DẪN (SLUG)",
      render: (brand) => <span className="text-gray-400">{brand.slug}</span>,
    },

    {
      header: "TRẠNG THÁI",
      align: "center",
      render: (brand) => {
        const active = brand.status === 1;
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
      render: (brand) => (
        <span className="text-gray-400 whitespace-nowrap">
          {formatDate(brand.created_at)}
        </span>
      ),
    },
    {
      header: "THAO TÁC",
      align: "right",
      render: (brand) => (
        <RowActions
          onEdit={canEdit ? () => openEditModal(brand.id) : undefined}
          onDelete={canDelete ? () => handleDeleteBrand(brand.id) : undefined}
        />
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Danh Sách Thương Hiệu"
        subtitle="Quản lý và tổ chức cấu trúc phân loại sản phẩm trong hệ thống cửa hàng."
        data={brands}
        columns={columns}
        rowKey={(item) => item.id}
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
              + Thêm Thương Hiệu
            </Button>
          ) : undefined
        }
      />
      <ToastContainer />

      <BrandFormModal
        open={formOpen}
        mode={formMode}
        brandId={selectedBrandId}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />
    </>
  );
}
