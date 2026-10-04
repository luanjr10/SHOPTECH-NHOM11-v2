import { useState } from "react";
import { Label, Textarea, TextInput } from "flowbite-react";
import FormModal from "../common/FormModal";
import { adjustStock } from "../../services/seller.services";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { InventoryItem } from "../../types/seller.types";

interface Props {
  open: boolean;
  storeId: number;
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function StockAdjustModal({ open, storeId, item, onClose, onSaved }: Props) {
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!item) return;

    const amount = Math.abs(parseInt(quantity, 10));
    if (!amount) {
      notifyError("Vui lòng nhập số lượng hợp lệ");
      return;
    }

    setSubmitting(true);
    try {
      await adjustStock(storeId, item.id, direction === "in" ? amount : -amount, reason || undefined);
      notifySuccess("Cập nhật tồn kho thành công");
      setQuantity("1");
      setReason("");
      setDirection("in");
      onSaved();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Cập nhật tồn kho thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`Điều chỉnh tồn kho — ${item.name}`}
      onSubmit={handleSubmit}
      submitLabel={submitting ? "Đang lưu..." : "Xác nhận"}
      formKey={item.id}
      size="md"
    >
      <div>
        <Label>Loại thao tác</Label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDirection("in")}
            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              direction === "in"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            + Nhập thêm
          </button>
          <button
            type="button"
            onClick={() => setDirection("out")}
            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              direction === "out"
                ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            − Xuất/hao hụt
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="stock-quantity">Số lượng</Label>
        <TextInput
          id="stock-quantity"
          type="number"
          min={1}
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-400">
          Tồn kho hiện tại: <span className="font-semibold text-gray-600 dark:text-gray-300">{item.stock}</span>
        </p>
      </div>

      <div>
        <Label htmlFor="stock-reason">Ghi chú (không bắt buộc)</Label>
        <Textarea
          id="stock-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ví dụ: nhập thêm hàng từ NCC, hao hụt kiểm kê..."
        />
      </div>
    </FormModal>
  );
}
