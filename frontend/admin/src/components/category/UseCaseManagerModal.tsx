import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  FileInput,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import { Plus, SquarePen, Trash, X } from "lucide-react";
import FieldError from "../common/FieldError";
import StatusToggle from "../common/StatusToggle";
import { notifySuccess, notifyError } from "../../helpers/notify";
import { confirmDelete } from "../../helpers/confirmDelete";
import { parseValidationErrors, firstError } from "../../helpers/formErrors";
import {
  createUseCase,
  deleteUseCase,
  getUseCasesByCategory,
  updateUseCase,
} from "../../services/use-cases.services";
import { UseCaseItem } from "../../types/use-cases.types";
import { ValidationErrors } from "../../types/common.types";

interface UseCaseManagerModalProps {
  open: boolean;
  categoryId?: number;
  categoryName?: string;
  onClose: () => void;
}

type View = "list" | "create" | "edit";

interface DraftRow {
  name: string;
  sortOrder: string;
  status: boolean;
  image: File | null;
}

const emptyRow = (): DraftRow => ({
  name: "",
  sortOrder: "0",
  status: true,
  image: null,
});

export default function UseCaseManagerModal({
  open,
  categoryId,
  categoryName,
  onClose,
}: UseCaseManagerModalProps) {
  const [items, setItems] = useState<UseCaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [view, setView] = useState<View>("list");

  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const [editing, setEditing] = useState<UseCaseItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("0");
  const [editActive, setEditActive] = useState(true);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editErrors, setEditErrors] = useState<ValidationErrors>({});

  const loadItems = () => {
    if (!categoryId) return;
    setLoading(true);
    getUseCasesByCategory(categoryId)
      .then((response) => setItems(response?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !categoryId) return;
    setView("list");
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryId]);

  const openCreateForm = () => {
    setRows([emptyRow()]);
    setRowErrors({});
    setView("create");
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (index: number) =>
    setRows((prev) => prev.filter((_, i) => i !== index));
  const updateRow = <K extends keyof DraftRow>(
    index: number,
    field: K,
    value: DraftRow[K],
  ) =>
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryId) return;

    const filled = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.name.trim() !== "" || row.image !== null);

    if (filled.length === 0) {
      notifyError("Vui lòng nhập ít nhất một Quick Link");
      return;
    }

    const clientErrors: Record<number, string> = {};
    filled.forEach(({ row, index }) => {
      if (row.name.trim() === "") {
        clientErrors[index] = "Vui lòng nhập tên Quick Link";
      } else if (!row.image) {
        clientErrors[index] = "Vui lòng chọn ảnh cho Quick Link";
      }
    });
    if (Object.keys(clientErrors).length > 0) {
      setRowErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    setRowErrors({});

    let created = 0;
    for (const { row, index } of filled) {
      const formData = new FormData();
      formData.set("name", row.name.trim());
      formData.set("sortOrder", row.sortOrder || "0");
      formData.set("status", row.status ? "1" : "0");
      formData.set("image", row.image as File);

      try {
        await createUseCase(categoryId, formData);
        created++;
      } catch (error) {
        const validationErrors = parseValidationErrors(error);
        const firstMsg =
          firstError(validationErrors, "name") ||
          firstError(validationErrors, "image") ||
          firstError(validationErrors, "sortOrder") ||
          firstError(validationErrors, "status");

        setRowErrors({ [index]: firstMsg || "Tạo Quick Link thất bại" });
        setSubmitting(false);

        if (created > 0) {
          notifyError(
            `Đã thêm ${created} Quick Link, dừng lại ở dòng ${index + 1} do lỗi`,
          );
          loadItems();
        } else {
          notifyError(`Lỗi ở dòng ${index + 1}`);
        }
        return;
      }
    }

    setSubmitting(false);
    notifySuccess(`Đã thêm ${created} Quick Link`);
    setView("list");
    loadItems();
  };

  const openEditForm = (item: UseCaseItem) => {
    setEditing(item);
    setEditName(item.name);
    setEditSortOrder(String(item.sortOrder ?? 0));
    setEditActive(item.status);
    setEditImage(null);
    setEditErrors({});
    setView("edit");
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryId || !editing) return;

    const formData = new FormData();
    formData.set("name", editName.trim());
    formData.set("sortOrder", editSortOrder || "0");
    formData.set("status", editActive ? "1" : "0");
    if (editImage) {
      formData.set("image", editImage);
    }

    try {
      setSubmitting(true);
      setEditErrors({});
      await updateUseCase(categoryId, editing.id, formData);
      notifySuccess("Cập nhật Quick Link thành công");
      setView("list");
      loadItems();
    } catch (error) {
      const validationErrors = parseValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setEditErrors(validationErrors);
      } else {
        notifyError("Cập nhật Quick Link thất bại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item: UseCaseItem) => {
    if (!categoryId) return;
    confirmDelete(() => deleteUseCase(categoryId, item.id), {
      title: "Xóa Quick Link này?",
      successText: "Quick Link đã được xóa",
    }).then((deleted) => {
      if (deleted) loadItems();
    });
  };

  return (
    <Modal show={open} size="4xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <div className="flex flex-row items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quản Lý Quick Link
              </h3>
              {categoryName && (
                <p className="text-sm text-slate-400 mt-0.5">
                  Danh mục: <span className="font-medium">{categoryName}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 cursor-pointer"
              onClick={onClose}
            >
              <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
            </button>
          </div>

          {view === "list" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {loading
                    ? "Đang tải..."
                    : `${items.length} Quick Link trong danh mục này`}
                </p>
                <Button
                  size="sm"
                  onClick={openCreateForm}
                  className="cursor-pointer"
                >
                  <Plus className="mr-1 h-4 w-4" /> Thêm Quick Link
                </Button>
              </div>

              {!loading && items.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-500">
                  Chưa có Quick Link nào. Bấm "Thêm Quick Link" để tạo mới.
                </div>
              )}

              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0b1120]/60 p-3"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover border border-slate-700 bg-white/5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-gray-200">
                        {item.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        /{item.slug} · Thứ tự: {item.sortOrder}
                      </div>
                    </div>
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                        item.status
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      }`}
                    >
                      {item.status ? "Đang hiển thị" : "Đang ẩn"}
                    </span>
                    <div className="flex items-center gap-2 pl-2">
                      <button
                        type="button"
                        title="Chỉnh sửa"
                        className="cursor-pointer text-gray-400 hover:text-amber-400 transition"
                        onClick={() => openEditForm(item)}
                      >
                        <SquarePen className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Xóa"
                        className="cursor-pointer text-gray-400 hover:text-rose-400 transition"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {view === "create" && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Thêm nhiều Quick Link cùng lúc — mỗi dòng là một Quick Link.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={addRow}
                  className="cursor-pointer"
                >
                  <Plus className="mr-1 h-4 w-4" /> Thêm dòng
                </Button>
              </div>

              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-800 bg-[#0b1120]/60 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-semibold text-slate-400">
                        Quick Link #{index + 1}
                      </span>
                      <button
                        type="button"
                        title="Xóa dòng"
                        onClick={() => removeRow(index)}
                        disabled={rows.length === 1}
                        className="cursor-pointer text-gray-500 hover:text-rose-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <Label htmlFor={`row-name-${index}`}>
                          Tên Quick Link
                        </Label>
                        <TextInput
                          id={`row-name-${index}`}
                          className="mt-1"
                          placeholder="Chơi game"
                          value={row.name}
                          onChange={(e) =>
                            updateRow(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`row-sort-${index}`}>Thứ tự</Label>
                        <TextInput
                          id={`row-sort-${index}`}
                          className="mt-1"
                          type="number"
                          min="0"
                          value={row.sortOrder}
                          onChange={(e) =>
                            updateRow(index, "sortOrder", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <div className="flex-1 min-w-[220px]">
                        <Label htmlFor={`row-image-${index}`}>Ảnh</Label>
                        <FileInput
                          id={`row-image-${index}`}
                          className="mt-1"
                          accept="image/*"
                          onChange={(e) =>
                            updateRow(
                              index,
                              "image",
                              e.target.files?.[0] ?? null,
                            )
                          }
                        />
                      </div>
                      {row.image && (
                        <img
                          src={URL.createObjectURL(row.image)}
                          alt="preview"
                          className="h-14 w-14 rounded-lg object-cover border border-slate-700"
                        />
                      )}
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                        <Checkbox
                          checked={row.status}
                          onChange={(e) =>
                            updateRow(index, "status", e.target.checked)
                          }
                        />
                        Hiển thị
                      </label>
                    </div>

                    <FieldError message={rowErrors[index]} />
                  </div>
                ))}
              </div>

              <div className="flex flex-row gap-2 items-center justify-end pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer"
                >
                  {submitting
                    ? "Đang lưu..."
                    : `Thêm ${rows.length} Quick Link`}
                </Button>
                <Button
                  type="button"
                  onClick={() => setView("list")}
                  disabled={submitting}
                  className="w-30 cursor-pointer"
                >
                  Quay Lại
                </Button>
              </div>
            </form>
          )}

          {view === "edit" && editing && (
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="edit-name">Tên Quick Link</Label>
                </div>
                <TextInput
                  id="edit-name"
                  required
                  placeholder="Chơi game"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  color={editErrors.name ? "failure" : undefined}
                />
                <FieldError message={firstError(editErrors, "name")} />
              </div>

              <div>
                <div className="mb-2 block">
                  <Label htmlFor="edit-sort">Thứ Tự Hiển Thị</Label>
                </div>
                <TextInput
                  id="edit-sort"
                  type="number"
                  min="0"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                  color={editErrors.sortOrder ? "failure" : undefined}
                />
                <FieldError message={firstError(editErrors, "sortOrder")} />
              </div>

              <div>
                <div className="mb-2 block">
                  <Label htmlFor="edit-image">Thay Ảnh (tùy chọn)</Label>
                </div>
                {editing.image && !editImage && (
                  <img
                    src={editing.image}
                    alt={editing.name}
                    className="mb-2 h-20 w-20 rounded-lg object-cover border border-slate-700"
                  />
                )}
                <FileInput
                  id="edit-image"
                  accept="image/*"
                  onChange={(e) => setEditImage(e.target.files?.[0] ?? null)}
                />
                {editImage && (
                  <img
                    src={URL.createObjectURL(editImage)}
                    alt="preview"
                    className="mt-2 h-20 w-20 rounded-lg object-cover border border-slate-700"
                  />
                )}
                <FieldError message={firstError(editErrors, "image")} />
              </div>

              <StatusToggle
                checked={editActive}
                onChange={setEditActive}
                label="Trạng Thái Quick Link"
                activeText="Quick Link đang được hiển thị ngoài cửa hàng"
                inactiveText="Quick Link đang tạm ẩn"
                id="use-case-status"
              />

              <div className="flex flex-row gap-2 items-center justify-end">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-30 cursor-pointer"
                >
                  {submitting ? "Đang lưu..." : "Cập Nhật"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setView("list")}
                  disabled={submitting}
                  className="w-30 cursor-pointer"
                >
                  Quay Lại
                </Button>
              </div>
            </form>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
