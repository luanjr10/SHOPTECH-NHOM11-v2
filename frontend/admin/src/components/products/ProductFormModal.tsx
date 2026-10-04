import { useEffect, useRef, useState } from "react";
import { Checkbox, Label, Select, TextInput } from "flowbite-react";
import FormModal from "../common/FormModal";
import FieldError from "../common/FieldError";
import ImageManager from "../common/ImageManager";
import KeyValueListEditor from "../common/KeyValueListEditor";
import VariantsEditor, {
  VariantRow,
  emptyVariantRow,
} from "./VariantsEditor";
import StatusToggle from "../common/StatusToggle";
import { notifySuccess, notifyError } from "../../helpers/notify";
import { parseValidationErrors, firstError } from "../../helpers/formErrors";
import {
  createProduct,
  getProductById,
  updateProduct,
} from "../../services/products.services";
import { getUseCasesByCategory } from "../../services/use-cases.services";
import { CategoryItem } from "../../types/categories.types";
import { ProductItem, ProductVariant } from "../../types/products.types";
import { SpecificationItem } from "../../types/specification.types";
import { UseCaseItem } from "../../types/use-cases.types";
import { ValidationErrors } from "../../types/common.types";

interface ProductFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  productId?: number;
  categories: CategoryItem[];
  onClose: () => void;
  onSaved: () => void;
  submitCreate?: (data: FormData) => Promise<unknown>;
  submitUpdate?: (id: number, data: FormData) => Promise<{ success?: boolean } | undefined>;
}

const EMPTY_SPECS: SpecificationItem[] = [];

export default function ProductFormModal({
  open,
  mode,
  productId,
  categories,
  onClose,
  onSaved,
  submitCreate = createProduct,
  submitUpdate = updateProduct,
}: ProductFormModalProps) {
  const [productDetail, setProductDetail] = useState<ProductItem | null>(null);
  const [specifications, setSpecifications] =
    useState<SpecificationItem[]>(EMPTY_SPECS);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [newImages, setNewImages] = useState<(File | null)[]>([null]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const codeInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [useCases, setUseCases] = useState<UseCaseItem[]>([]);
  const [selectedUseCaseIds, setSelectedUseCaseIds] = useState<string[]>([]);

  const toggleUseCase = (id: string) => {
    setSelectedUseCaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    if (!open) return;

    setErrors({});

    if (mode === "edit" && productId) {
      getProductById(productId).then((response) => {
        if (!response?.data) return;
        setProductDetail(response.data);
        setIsActive(response.data.status === 1);
        setExistingImages(response.data.images || []);
        setNewImages([null]);
        setSpecifications(response.data.specifications || []);
        setVariants(
          (response.data.variants || []).map((variant: ProductVariant) => ({
            sku: variant.sku ?? "",
            color: variant.attributes?.color ?? "",
            storage: variant.attributes?.storage ?? "",
            ram: variant.attributes?.ram ?? "",
            cpu: variant.attributes?.cpu ?? "",
            price: variant.price != null ? String(variant.price) : "",
            stock: variant.stock != null ? String(variant.stock) : "",
          })),
        );
        setSelectedCategoryId(String(response.data.category_id ?? ""));
        setSelectedUseCaseIds(response.data.use_case_ids || []);
      });
    } else {
      setProductDetail(null);
      setIsActive(true);
      setExistingImages([]);
      setNewImages([null]);
      setSpecifications([]);
      setVariants([]);
      setSelectedCategoryId(String(categories[0]?.id ?? ""));
      setSelectedUseCaseIds([]);
    }
  }, [open, mode, productId, categories]);

  useEffect(() => {
    if (!open || !selectedCategoryId) {
      setUseCases([]);
      return;
    }

    let ignore = false;
    getUseCasesByCategory(Number(selectedCategoryId))
      .then((response) => {
        if (ignore) return;
        const list: UseCaseItem[] = response?.data || [];
        setUseCases(list);
        const validIds = new Set(list.map((item) => item._id));
        setSelectedUseCaseIds((prev) => prev.filter((id) => validIds.has(id)));
      })
      .catch(() => {
        if (!ignore) setUseCases([]);
      });

    return () => {
      ignore = true;
    };
  }, [open, selectedCategoryId]);

  const handleImageChange = (index: number, fileList: FileList | null) => {
    const newFile = fileList && fileList.length > 0 ? fileList[0] : null;
    setNewImages((prev) => prev.map((item, i) => (i === index ? newFile : item)));
  };

  const addImageSlot = () => setNewImages((prev) => [...prev, null]);
  const removeImageSlot = (index: number) =>
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  const removeExistingImage = (index: number) =>
    setExistingImages((prev) => prev.filter((_, i) => i !== index));

  const handleSpecificationChange = (
    index: number,
    field: keyof SpecificationItem,
    value: string,
  ) => {
    setSpecifications((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };
  const addSpecification = () =>
    setSpecifications((prev) => [...prev, { name: "", value: "" }]);
  const removeSpecification = (index: number) =>
    setSpecifications((prev) => prev.filter((_, i) => i !== index));

  const handleVariantChange = (
    index: number,
    field: keyof VariantRow,
    value: string,
  ) =>
    setVariants((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  const addVariant = () => setVariants((prev) => [...prev, emptyVariantRow()]);
  const removeVariant = (index: number) =>
    setVariants((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const selectedNewImages = newImages.filter(
      (item): item is File => item !== null,
    );
    const totalImages = existingImages.length + selectedNewImages.length;

    if (totalImages === 0) {
      setErrors((prev) => ({
        ...prev,
        images: ["Vui lòng chọn ít nhất một ảnh sản phẩm"],
      }));
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("status", isActive ? "1" : "0");
    selectedNewImages.forEach((image) => formData.append("images[]", image));
    formData.set("existing_images", JSON.stringify(existingImages));
    formData.set(
      "specifications",
      JSON.stringify(
        specifications.filter(
          (item) => item.name.trim() !== "" || item.value.trim() !== "",
        ),
      ),
    );
    formData.set("use_case_ids", JSON.stringify(selectedUseCaseIds));

    const variantsPayload = variants
      .filter(
        (variant) =>
          variant.sku.trim() !== "" ||
          variant.color.trim() !== "" ||
          variant.storage.trim() !== "" ||
          variant.ram.trim() !== "" ||
          variant.cpu.trim() !== "" ||
          variant.price.trim() !== "" ||
          variant.stock.trim() !== "",
      )
      .map((variant) => ({
        sku: variant.sku.trim(),
        attributes: {
          ...(variant.color.trim() && { color: variant.color.trim() }),
          ...(variant.storage.trim() && { storage: variant.storage.trim() }),
          ...(variant.ram.trim() && { ram: variant.ram.trim() }),
          ...(variant.cpu.trim() && { cpu: variant.cpu.trim() }),
        },
        price: variant.price.trim() !== "" ? Number(variant.price) : undefined,
        stock: variant.stock.trim() !== "" ? Number(variant.stock) : undefined,
      }));
    formData.set("variants", JSON.stringify(variantsPayload));

    try {
      setErrors({});

      if (mode === "create") {
        const response = await submitCreate(formData);
        if (response) {
          notifySuccess("Thêm Mới Sản Phẩm Thành Công");
          onClose();
          onSaved();
        }
      } else {
        const response = await submitUpdate(productId!, formData);
        if (response?.success) {
          notifySuccess("Chỉnh Sửa Sản Phẩm Thành Công");
          onClose();
          onSaved();
        }
      }
    } catch (error) {
      const validationErrors = parseValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
      } else {
        notifyError(
          mode === "create" ? "Thêm mới sản phẩm thất bại" : "Chỉnh sửa sản phẩm thất bại",
        );
      }
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Thêm Mới Sản Phẩm" : "Chỉnh Sửa Sản Phẩm"}
      onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Thêm Mới" : "Chỉnh Sửa"}
      formKey={`${mode}-${productId ?? "new"}`}
      initialFocusRef={codeInputRef}
    >
      <div>
        <div className="mb-2 block">
          <Label htmlFor="code">Mã Sản Phẩm</Label>
        </div>
        <TextInput
          id="code"
          ref={codeInputRef}
          placeholder="PRO-01"
          required
          name="code"
          defaultValue={productDetail?.code}
          readOnly={mode === "edit"}
          color={errors.code ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "code")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="name">Tên Sản Phẩm</Label>
        </div>
        <TextInput
          id="name"
          type="text"
          required
          placeholder="Asus Viobook"
          name="name"
          defaultValue={productDetail?.name}
          color={errors.name ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "name")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="price">Giá Sản Phẩm</Label>
        </div>
        <TextInput
          id="price"
          required
          placeholder="Nhập giá sản phẩm"
          name="price"
          step="0.01"
          min="0"
          defaultValue={productDetail?.price}
          color={errors.price ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "price")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="discount_percent">Giảm Giá (%)</Label>
        </div>
        <TextInput
          id="discount_percent"
          type="number"
          placeholder="0"
          name="discount_percent"
          step="1"
          min="0"
          max="100"
          defaultValue={productDetail?.discount_percent ?? 0}
          color={errors.discount_percent ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "discount_percent")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="stock">Số Lượng</Label>
        </div>
        <TextInput
          id="stock"
          type="number"
          min="0"
          required
          placeholder="Nhập số lượng"
          name="stock"
          defaultValue={productDetail?.stock}
          color={errors.stock ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "stock")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="category_id">Danh Mục</Label>
        </div>
        <Select
          id="category_id"
          required
          name="category_id"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          color={errors.category_id ? "failure" : undefined}
        >
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <FieldError message={firstError(errors, "category_id")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label>Quick Link (theo danh mục đã chọn)</Label>
        </div>
        {useCases.length === 0 ? (
          <p className="text-sm text-slate-500">
            Danh mục này chưa có Quick Link. Thêm Quick Link trong màn hình Quản
            lý Danh mục.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {useCases.map((item) => (
              <label
                key={item._id}
                htmlFor={`use-case-${item._id}`}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-[#0b1120]/60 p-2"
              >
                <Checkbox
                  id={`use-case-${item._id}`}
                  checked={selectedUseCaseIds.includes(item._id)}
                  onChange={() => toggleUseCase(item._id)}
                />
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-7 w-7 shrink-0 rounded object-cover border border-slate-700 bg-white/5"
                />
                <span className="truncate text-sm text-gray-200">
                  {item.name}
                </span>
              </label>
            ))}
          </div>
        )}
        <FieldError message={firstError(errors, "use_case_ids")} />
      </div>

      <KeyValueListEditor
        title="Thông Số Kỹ Thuật"
        items={specifications}
        onChange={handleSpecificationChange}
        onAdd={addSpecification}
        onRemove={removeSpecification}
        addLabel="+ Thêm thông số"
        keyLabel="Tên thông số"
        keyPlaceholder="Ví dụ: RAM"
        valuePlaceholder="Ví dụ: 16GB"
      />

      <VariantsEditor
        variants={variants}
        onChange={handleVariantChange}
        onAdd={addVariant}
        onRemove={removeVariant}
      />

      <div>
        <ImageManager
          mode={mode}
          existingImages={existingImages}
          onRemoveExisting={removeExistingImage}
          newImages={newImages}
          onNewImageChange={handleImageChange}
          onAddSlot={addImageSlot}
          onRemoveSlot={removeImageSlot}
        />
        <FieldError message={firstError(errors, "images")} />
      </div>

      <StatusToggle
        checked={isActive}
        onChange={setIsActive}
        label="Trạng Thái Sản Phẩm"
        activeText="Sản Phẩm đang được hiển thị ngoài cửa hàng"
        inactiveText="Sản Phẩm đang tạm ẩn"
        id="product-status"
      />
    </FormModal>
  );
}
