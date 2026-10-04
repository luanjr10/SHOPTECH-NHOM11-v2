import { useState } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { submitProductReview } from "../../services/reviews";
import type { ProductReview } from "../../types/review";
import { type ApiError } from "../../libs/api";

interface Props {
  open: boolean;
  productId: number;
  productName: string;
  existingReview?: ProductReview | null;
  onClose: () => void;
  onSubmitted: (review: ProductReview) => void;
}

const MAX_IMAGES = 5;

function ReviewFormModal({ open, productId, productName, existingReview, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)].slice(0, MAX_IMAGES));
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const review = await submitProductReview(productId, { rating, comment: comment.trim() || undefined, images });
      onSubmitted(review);
      onClose();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Gửi đánh giá thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-sans text-[16px] font-bold text-gray-900">
            {existingReview ? "Sửa đánh giá của bạn" : "Viết đánh giá"}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-4 line-clamp-1 font-sans text-[13px] text-gray-500">
          Sản phẩm: <span className="font-medium text-gray-700">{productName}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-sans text-[13px] font-medium text-gray-700">Chất lượng sản phẩm</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-0.5"
                >
                  <Star
                    className={`size-7 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 stroke-amber-400"
                        : "fill-transparent stroke-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-[13px] font-medium text-gray-700">Nhận xét chi tiết</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-sans text-[13px] outline-none focus:border-primary500"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-[13px] font-medium text-gray-700">
              Ảnh thực tế (tuỳ chọn, tối đa {MAX_IMAGES} ảnh)
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
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
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
            {existingReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReviewFormModal;
