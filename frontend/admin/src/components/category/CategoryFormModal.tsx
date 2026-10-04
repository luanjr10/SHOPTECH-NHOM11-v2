import { useEffect, useRef, useState } from "react";
import { Checkbox, Label, Select, Textarea, TextInput } from "flowbite-react";
import { ImageOff } from "lucide-react";
import FormModal from "../common/FormModal";
import FieldError from "../common/FieldError";
import StatusToggle from "../common/StatusToggle";
import { notifySuccess, notifyError } from "../../helpers/notify";
import { parseValidationErrors, firstError } from "../../helpers/formErrors";
import {
  createCategory,
  editCategory,
  getAllCategoriesFlat,
  getCategoryById,
  uploadCategoryImage,
} from "../../services/categories.services";
import { CategoryItem } from "../../types/categories.types";
import { ValidationErrors } from "../../types/common.types";
import { BrandItem } from "../../types/brands.types";
import { getAllBrandsNoPagination } from "../../services/brands.services";

interface CategoryFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  categoryId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function CategoryFormModal({
  open,
  mode,
  categoryId,
  onClose,
  onSaved,
}: CategoryFormModalProps) {
  const [categoryDetail, setCategoryDetail] = useState<CategoryItem | null>(
    null,
  );
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const codeInputRef = useRef<HTMLInputElement>(null);

  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [parentId, setParentId] = useState<string>("");
  const [displayType, setDisplayType] = useState<"icon" | "image">("icon");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleBrand = (brandId: number) => {
    setSelectedBrandIds((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId],
    );
  };

  useEffect(() => {
    const getBrands = async () => {
      const response = await getAllBrandsNoPagination();
      setBrands(response.data);
    };
    getBrands();
  }, []);

  useEffect(() => {
    if (!open) return;
    getAllCategoriesFlat().then((response) => {
      setAllCategories(response?.data ?? []);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setImageFile(null);

    if (mode === "edit" && categoryId) {
      getCategoryById(categoryId).then((response) => {
        if (!response?.data) return;
        setCategoryDetail(response.data);
        setIsActive(response.data.status === 1);
        setSelectedBrandIds(response.data.brand_ids ?? []);
        setParentId(
          response.data.parent_id ? String(response.data.parent_id) : "",
        );
        setDisplayType(response.data.display_type === "image" ? "image" : "icon");
      });
    } else {
      setCategoryDetail(null);
      setIsActive(true);
      setSelectedBrandIds([]);
      setParentId("");
      setDisplayType("icon");
    }
  }, [open, mode, categoryId]);

  const excludedIds = new Set<number>();
  if (categoryId) {
    excludedIds.add(categoryId);
    let frontier = [categoryId];
    while (frontier.length > 0) {
      const nextFrontier: number[] = [];
      for (const category of allCategories) {
        if (
          category.parent_id &&
          frontier.includes(category.parent_id) &&
          !excludedIds.has(category.id)
        ) {
          excludedIds.add(category.id);
          nextFrontier.push(category.id);
        }
      }
      frontier = nextFrontier;
    }
  }

  const byParent = new Map<number | null, CategoryItem[]>();
  for (const category of allCategories) {
    if (excludedIds.has(category.id)) continue;
    const key = category.parent_id ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), category]);
  }

  const parentOptions: { id: number; label: string }[] = [];
  const walk = (parentKey: number | null, depth: number) => {
    for (const category of byParent.get(parentKey) ?? []) {
      parentOptions.push({
        id: category.id,
        label: `${"— ".repeat(depth)}${category.name}`,
      });
      walk(category.id, depth + 1);
    }
  };
  walk(null, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const commonValues = {
      name: formData.get("name") as string,
      parent_id: parentId ? Number(parentId) : null,
      description: formData.get("description") as string,
      display_type: displayType,
      icon: displayType === "icon" ? (formData.get("icon") as string) : undefined,
      color: displayType === "icon" ? (formData.get("color") as string) : undefined,
      status: isActive ? 1 : 0,
      brand_ids: selectedBrandIds,
    };

    setSubmitting(true);

    try {
      setErrors({});
      let savedId = categoryId;

      if (mode === "create") {
        const values = {
          code: formData.get("code") as string,
          ...commonValues,
        };
        const response = await createCategory(values);
        savedId = response?.data?.id;
      } else {
        await editCategory(commonValues, categoryId!);
      }

      if (displayType === "image" && imageFile && savedId) {
        await uploadCategoryImage(savedId, imageFile);
      }

      notifySuccess(
        mode === "create"
          ? "Thêm Mới Danh Mục Thành Công"
          : "Chỉnh Sửa Danh Mục Thành Công",
      );
      onClose();
      onSaved();
    } catch (error) {
      const validationErrors = parseValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
      } else {
        notifyError(
          mode === "create"
            ? "Thêm mới danh mục thất bại"
            : "Chỉnh sửa danh mục thất bại",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const previewUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : categoryDetail?.image || null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={
        mode === "create"
          ? "Thêm Mới Danh Mục Sản Phẩm"
          : "Chỉnh Sửa Danh Mục Sản Phẩm"
      }
      onSubmit={handleSubmit}
      submitLabel={submitting ? "Đang lưu..." : mode === "create" ? "Thêm Mới" : "Chỉnh Sửa"}
      formKey={`${mode}-${categoryId ?? "new"}`}
      initialFocusRef={codeInputRef}
    >
      <div>
        <div className="mb-2 block">
          <Label htmlFor="code">Mã Danh Mục</Label>
        </div>
        <TextInput
          id="code"
          ref={codeInputRef}
          placeholder="CATE-01"
          required
          name="code"
          defaultValue={categoryDetail?.code}
          readOnly={mode === "edit"}
          color={errors.code ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "code")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="name">Tên Danh Mục</Label>
        </div>
        <TextInput
          id="name"
          type="text"
          required
          placeholder="Laptop"
          name="name"
          defaultValue={categoryDetail?.name}
          color={errors.name ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "name")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="parent_id">Danh Mục Cha</Label>
        </div>
        <Select
          id="parent_id"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          color={errors.parent_id ? "failure" : undefined}
        >
          <option value="">— Không có (đây là danh mục gốc) —</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-slate-500">
          Chọn danh mục cha nếu đây là danh mục con (VD: "Cáp, sạc" thuộc "Phụ
          Kiện"). Danh mục con vẫn có thể có danh mục con riêng — không giới
          hạn số cấp.
        </p>
        <FieldError message={firstError(errors, "parent_id")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="brand">Chọn Thương Hiệu Cho Danh Mục Này</Label>
        </div>
        <div className="grid max-w-md grid-cols-2 gap-4 mt-5 sm:grid-cols-3">
          {brands.length > 0 &&
            brands.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox
                  id={`brand-${item.id}`}
                  value={item.id}
                  checked={selectedBrandIds.includes(item.id)}
                  onChange={() => toggleBrand(item.id)}
                />
                <Label htmlFor={`brand-${item.id}`}>{item.name}</Label>
              </div>
            ))}
        </div>
        <FieldError message={firstError(errors, "brand_ids")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="description">Mô Tả Danh Mục</Label>
        </div>
        <Textarea
          id="description"
          rows={5}
          required
          placeholder="Sản Phẩm abc Này Rất Tuyệt Vời"
          name="description"
          defaultValue={categoryDetail?.description}
          color={errors.description ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "description")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label>Hiển Thị Danh Mục Bằng</Label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDisplayType("icon")}
            className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition ${
              displayType === "icon"
                ? "border-primary500 bg-primary500/10 text-primary500"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            Icon Lucide
          </button>
          <button
            type="button"
            onClick={() => setDisplayType("image")}
            className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition ${
              displayType === "image"
                ? "border-primary500 bg-primary500/10 text-primary500"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            Ảnh Thật (Upload)
          </button>
        </div>
      </div>

      {displayType === "icon" ? (
        <>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="icon">Tên Icon Lucide React</Label>
            </div>
            <TextInput
              id="icon"
              type="text"
              required
              placeholder="Monitor"
              name="icon"
              defaultValue={categoryDetail?.icon}
              color={errors.icon ? "failure" : undefined}
            />
            <FieldError message={firstError(errors, "icon")} />
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="color">Màu Cho Icon Lucide React</Label>
            </div>
            <TextInput
              id="color"
              type="text"
              required
              placeholder="#686868"
              name="color"
              defaultValue={categoryDetail?.color}
              color={errors.color ? "failure" : undefined}
            />
            <FieldError message={firstError(errors, "color")} />
          </div>
        </>
      ) : (
        <div>
          <div className="mb-2 block">
            <Label htmlFor="category-image">Ảnh Đại Diện Danh Mục</Label>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Xem trước"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageOff className="h-6 w-6 text-slate-600" />
              )}
            </div>
            <input
              id="category-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-primary500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {mode === "create"
              ? "Ảnh sẽ được tải lên ngay sau khi tạo danh mục."
              : "Bỏ trống nếu muốn giữ nguyên ảnh hiện tại."}
          </p>
          <FieldError message={firstError(errors, "image")} />
        </div>
      )}

      <StatusToggle
        checked={isActive}
        onChange={setIsActive}
        label="Trạng Thái Danh Mục"
        activeText="Danh mục đang được hiển thị ngoài cửa hàng"
        inactiveText="Danh mục đang tạm ẩn"
        id="category-status"
      />
    </FormModal>
  );
}
