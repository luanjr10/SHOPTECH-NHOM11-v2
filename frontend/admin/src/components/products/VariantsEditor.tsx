import { Button, Label, TextInput } from "flowbite-react";
import { Trash } from "lucide-react";

export interface VariantRow {
  sku: string;
  color: string;
  storage: string;
  ram: string;
  cpu: string;
  price: string;
  stock: string;
}

export const emptyVariantRow = (): VariantRow => ({
  sku: "",
  color: "",
  storage: "",
  ram: "",
  cpu: "",
  price: "",
  stock: "",
});

interface VariantsEditorProps {
  variants: VariantRow[];
  onChange: (index: number, field: keyof VariantRow, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export default function VariantsEditor({
  variants,
  onChange,
  onAdd,
  onRemove,
}: VariantsEditorProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <Label>Phiên Bản (Variants)</Label>
          <p className="text-xs text-slate-500">
            Bỏ trống nếu sản phẩm chỉ có 1 phiên bản — hệ thống tự tạo mặc định.
          </p>
        </div>
        <Button type="button" size="sm" onClick={onAdd} className="cursor-pointer">
          + Thêm phiên bản
        </Button>
      </div>

      <div className="space-y-3">
        {variants.map((variant, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-700 p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Phiên bản #{index + 1}
              </span>
              <button
                type="button"
                title="Xóa phiên bản"
                onClick={() => onRemove(index)}
                className="cursor-pointer text-gray-500 hover:text-rose-400 transition"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label htmlFor={`v-color-${index}`}>Màu sắc</Label>
                <TextInput
                  id={`v-color-${index}`}
                  className="mt-1"
                  placeholder="Cam Vũ Trụ"
                  value={variant.color}
                  onChange={(e) => onChange(index, "color", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`v-storage-${index}`}>Dung lượng</Label>
                <TextInput
                  id={`v-storage-${index}`}
                  className="mt-1"
                  placeholder="256GB"
                  value={variant.storage}
                  onChange={(e) => onChange(index, "storage", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`v-ram-${index}`}>RAM</Label>
                <TextInput
                  id={`v-ram-${index}`}
                  className="mt-1"
                  placeholder="16GB"
                  value={variant.ram}
                  onChange={(e) => onChange(index, "ram", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`v-cpu-${index}`}>CPU</Label>
                <TextInput
                  id={`v-cpu-${index}`}
                  className="mt-1"
                  placeholder="Ultra 5"
                  value={variant.cpu}
                  onChange={(e) => onChange(index, "cpu", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label htmlFor={`v-sku-${index}`}>SKU</Label>
                <TextInput
                  id={`v-sku-${index}`}
                  className="mt-1"
                  placeholder="Tự sinh nếu để trống"
                  value={variant.sku}
                  onChange={(e) => onChange(index, "sku", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`v-price-${index}`}>Giá</Label>
                <TextInput
                  id={`v-price-${index}`}
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Theo giá sản phẩm"
                  value={variant.price}
                  onChange={(e) => onChange(index, "price", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`v-stock-${index}`}>Tồn kho</Label>
                <TextInput
                  id={`v-stock-${index}`}
                  className="mt-1"
                  type="number"
                  min="0"
                  placeholder="Theo tồn kho sản phẩm"
                  value={variant.stock}
                  onChange={(e) => onChange(index, "stock", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
