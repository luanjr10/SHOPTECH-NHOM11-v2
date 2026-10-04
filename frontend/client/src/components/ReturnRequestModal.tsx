import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { submitReturnRequest } from "../services/returns";
import type { ReturnRequest, ReturnRequestType } from "../types/order";
import { type ApiError } from "../libs/api";

interface Props {
  open: boolean;
  orderItemId: number;
  productName: string;
  onClose: () => void;
  onSubmitted: (returnRequest: ReturnRequest) => void;
}

const MAX_IMAGES = 5;

function ReturnRequestModal({ open, orderItemId, productName, onClose, onSubmitted }: Props) {
  const [type, setType] = useState<ReturnRequestType>("return");
  const [reason, setReason] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...images, ...Array.from(files)].slice(0, MAX_IMAGES);
    setImages(next);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setType("return");
    setReason("");
    setImages([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do.");
      return;
    }
    if (images.length === 0) {
      setError("Vui lòng tải lên ít nhất 1 ảnh minh chứng.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitReturnRequest(orderItemId, { type, reason: reason.trim(), images });
      onSubmitted(result);
      reset();
      onClose();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Gửi yêu cầu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-sans text-[16px] font-bold text-gray-900">Yêu cầu hoàn trả / bảo hành</h3>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-700">
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-4 line-clamp-1 font-sans text-[13px] text-gray-500">
          Sản phẩm: <span className="font-medium text-gray-700">{productName}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-sans text-[13px] font-medium text-gray-700">Loại yêu cầu</label>
            <div className="flex gap-2">
              {(
                [
                  { value: "return", label: "Hoàn trả" },
                  { value: "warranty", label: "Bảo hành" },
                ] as { value: ReturnRequestType; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`flex-1 rounded-lg border py-2 font-sans text-[13px] font-semibold transition-colors ${
                    type === opt.value
                      ? "border-primary500 bg-primary500/10 text-primary500"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-[13px] font-medium text-gray-700">
              Lý do <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Mô tả tình trạng sản phẩm / lý do hoàn trả hoặc bảo hành..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-sans text-[13px] outline-none focus:border-primary500"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-[13px] font-medium text-gray-700">
              Ảnh minh chứng <span className="text-rose-500">*</span> (tối đa {MAX_IMAGES} ảnh)
            </label>
            <div className="flex flex-wrap gap-2">
              {images.map((file, idx) => (
                <div key={idx} className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-gray-200">
                  <img src={URL.createObjectURL(file)} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="flex size-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-primary500 hover:text-primary500">
                  <ImagePlus className="size-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>

          {error && <p className="font-sans text-[12px] text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-primary500 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary500/90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Gửi yêu cầu
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReturnRequestModal;
