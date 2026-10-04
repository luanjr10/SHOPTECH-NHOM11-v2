import { useEffect, useRef, useState } from "react";
import { Label, Textarea, TextInput } from "flowbite-react";
import FormModal from "../common/FormModal";
import FieldError from "../common/FieldError";
import StatusToggle from "../common/StatusToggle";
import { notifySuccess, notifyError } from "../../helpers/notify";
import { parseValidationErrors, firstError } from "../../helpers/formErrors";
import { ValidationErrors } from "../../types/common.types";
import { BrandItem } from "../../types/brands.types";
import {
  createBrand,
  editBrand,
  getBrandById,
} from "../../services/brands.services";
import SingleImageManager from "../common/SingleImageManager";

interface BrandFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  brandId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function BrandFormModal({
  open,
  mode,
  brandId,
  onClose,
  onSaved,
}: BrandFormModalProps) {
  const [brandDetail, setBrandDetail] = useState<BrandItem | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [newImages, setNewImages] = useState<File | null>(null);
  const [existingImages, setExistingImages] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setErrors({});

    if (mode === "edit" && brandId) {
      getBrandById(brandId).then((response) => {
        if (!response?.data) return;
        setBrandDetail(response.data);
        setIsActive(response.data.status === 1);
        setExistingImages(response.data.logo|| null);
        setNewImages(null);
      });
    } else {
      setBrandDetail(null);
      setIsActive(true);
      setExistingImages(null);
      setNewImages(null);
    }
  }, [open, mode, brandId]);

  const handleImageChange = (fileList: FileList | null) => {
    const file = fileList && fileList.length > 0 ? fileList[0] : null;

    setNewImages(file);
  };

  const removeExistingImage = () => {
    setExistingImages(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!existingImages && !newImages) {
      setErrors((prev) => ({
        ...prev,
        images: ["Vui lòng chọn một ảnh sản phẩm"],
      }));
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("status", isActive ? "1" : "0");
    if (newImages) {
      formData.append("images[]", newImages);
    }

    formData.set(
      "existing_images",
      JSON.stringify(existingImages ? [existingImages] : []),
    );

    try {
      setErrors({});

      if (mode === "create") {
        const response = await createBrand(formData);
        if (response) {
          notifySuccess("Thêm Mới Thương Hiệu Thành Công");
          onClose();
          onSaved();
        }
      } else {
        const response = await editBrand(brandId!, formData);
        if (response.success) {
          notifySuccess("Chỉnh Sửa Thương Hiệu Thành Công");
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
          mode === "create"
            ? "Thêm mới thương hiệu thất bại"
            : "Chỉnh sửa thương hiệu thất bại",
        );
      }
    }
  };
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={
        mode === "create"
          ? "Thêm Mới Thương Hiệu Sản Phẩm"
          : "Chỉnh Sửa Thương Hiệu Sản Phẩm"
      }
      onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Thêm Mới" : "Chỉnh Sửa"}
      formKey={`${mode}-${brandId ?? "new"}`}
      initialFocusRef={codeInputRef}
    >
      <div>
        <div className="mb-2 block">
          <Label htmlFor="code">Mã Thương Hiệu</Label>
        </div>
        <TextInput
          id="code"
          ref={codeInputRef}
          placeholder="BR-01"
          required
          name="code"
          defaultValue={brandDetail?.code}
          readOnly={mode === "edit"}
          color={errors.code ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "code")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="name">Tên Thương Hiệu</Label>
        </div>
        <TextInput
          id="name"
          type="text"
          required
          placeholder="SamSung"
          name="name"
          defaultValue={brandDetail?.name}
          color={errors.name ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "name")} />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="description">Mô Tả Thương Hiệu</Label>
        </div>
        <Textarea
          id="description"
          rows={5}
          required
          placeholder="Thương Hiệu Sản Phẩm abc Này Rất Tuyệt Vời"
          name="description"
          defaultValue={brandDetail?.description}
          color={errors.description ? "failure" : undefined}
        />
        <FieldError message={firstError(errors, "description")} />
      </div>

      <div>
        <SingleImageManager
          mode={mode}
          existingImage={existingImages}
          newImage={newImages}
          onRemoveExisting={removeExistingImage}
          onNewImageChange={handleImageChange}
        />
        <FieldError message={firstError(errors, "images")} />
      </div>

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
