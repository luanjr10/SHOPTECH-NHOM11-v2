import { useEffect, useState } from "react";
import { BadgeCheck, ImageOff, Loader2, Star, User } from "lucide-react";
import { getProductReviews } from "../../services/reviews";
import type { ProductReview, ReviewStats } from "../../types/review";
import { useAuth } from "../../context/AuthContext";
import ReviewFormModal from "./ReviewFormModal";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= value ? "fill-amber-400 stroke-amber-400" : "fill-transparent stroke-gray-300"}`} />
      ))}
    </div>
  );
}

interface Props {
  productId: number;
  productName: string;
}

export function ProductReviews({ productId, productName }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = () => {
    setLoading(true);
    getProductReviews(productId, { rating: ratingFilter, verified: verifiedOnly })
      .then((res) => {
        setReviews(res.data);
        setStats(res.stats);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [productId, ratingFilter, verifiedOnly]);

  const myReview = reviews.find((r) => r.user.id === user?.id) ?? null;

  const handleSubmitted = (review: ProductReview) => {
    load();
    void review;
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
      <h2 className="mb-4 font-sans text-[16px] font-bold text-gray-900">Đánh giá {productName}</h2>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 sm:w-[180px]">
          <div className="flex items-baseline gap-1">
            <span className="font-sans text-[30px] sm:text-[36px] font-bold text-gray-900">{(stats?.average ?? 0).toFixed(1)}</span>
            <span className="font-sans text-[16px] text-gray-400">/5</span>
          </div>
          <Stars value={Math.round(stats?.average ?? 0)} size="size-5" />
          <p className="font-sans text-[12px] text-gray-500">{stats?.count ?? 0} lượt đánh giá</p>
          {user && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-3 rounded-full bg-primary500 px-5 py-2 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-primary500/90"
            >
              {myReview ? "Sửa đánh giá" : "Viết đánh giá"}
            </button>
          )}
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats?.breakdown?.[star] ?? 0;
            const pct = stats?.count ? Math.round((count / stats.count) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-8 shrink-0 font-sans text-[12px] text-gray-500">{star} sao</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right font-sans text-[12px] text-gray-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => setRatingFilter(undefined)}
          className={`rounded-full border px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
            ratingFilter === undefined ? "border-primary500 bg-primary500/10 text-primary500" : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          Tất cả
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRatingFilter(star)}
            className={`rounded-full border px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
              ratingFilter === star ? "border-primary500 bg-primary500/10 text-primary500" : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {star} sao
          </button>
        ))}
        <button
          type="button"
          onClick={() => setVerifiedOnly((v) => !v)}
          className={`rounded-full border px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
            verifiedOnly ? "border-primary500 bg-primary500/10 text-primary500" : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          Đã mua hàng
        </button>
      </div>

      <div className="mt-4 divide-y divide-gray-100">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-primary500" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <ImageOff className="size-8" />
            <p className="font-sans text-[13px]">Chưa có đánh giá nào phù hợp.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="flex gap-3 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary500/10 text-primary500">
                {review.user.avatar_url ? (
                  <img src={review.user.avatar_url} alt={review.user.name} className="size-full object-cover" />
                ) : (
                  <User className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-sans text-[13px] font-semibold text-gray-800">{review.user.name}</span>
                  {review.is_verified_purchase && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-sans text-[11px] font-medium text-emerald-600">
                      <BadgeCheck className="size-3" /> Đã mua hàng
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Stars value={review.rating} />
                  <span className="font-sans text-[11px] text-gray-400">{formatDate(review.created_at)}</span>
                </div>
                {review.comment && <p className="mt-1.5 font-sans text-[13px] text-gray-600">{review.comment}</p>}
                {review.images && review.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {review.images.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" className="size-16 rounded-lg border border-gray-200 object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ReviewFormModal
        open={formOpen}
        productId={productId}
        productName={productName}
        existingReview={myReview}
        onClose={() => setFormOpen(false)}
        onSubmitted={handleSubmitted}
      />
    </div>
  );
}
