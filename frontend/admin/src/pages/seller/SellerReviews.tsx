import { useCallback, useEffect, useState } from "react";
import { Star, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getStoreFollowers, getStoreReviews } from "../../services/seller.services";
import { formatDate } from "../../helpers/formatDate";
import DataTable, { Column } from "../../components/common/DataTable";
import type { ReviewItem, ReviewStats, StoreFollowerItem } from "../../types/review.types";

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-700"}`} />
      ))}
    </div>
  );
}

export default function SellerReviews() {
  const { activeStore } = useAuth();
  const [tab, setTab] = useState<"reviews" | "followers">("reviews");

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | "">("");
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);

  const [followers, setFollowers] = useState<StoreFollowerItem[]>([]);
  const [followerPage, setFollowerPage] = useState(1);
  const [followerTotalPages, setFollowerTotalPages] = useState(1);
  const [followerTotal, setFollowerTotal] = useState(0);

  const loadReviews = useCallback(() => {
    if (!activeStore) return;
    getStoreReviews(activeStore.id, { rating: ratingFilter || undefined, page: reviewPage }).then((res) => {
      const page = res?.data;
      setReviews(page?.data ?? []);
      setReviewTotalPages(page?.last_page ?? 1);
      setReviewTotal(page?.total ?? 0);
      setStats(page?.stats ?? null);
    });
  }, [activeStore, ratingFilter, reviewPage]);

  const loadFollowers = useCallback(() => {
    if (!activeStore) return;
    getStoreFollowers(activeStore.id, followerPage).then((res) => {
      const page = res?.data;
      setFollowers(page?.data ?? []);
      setFollowerTotalPages(page?.last_page ?? 1);
      setFollowerTotal(page?.total ?? 0);
    });
  }, [activeStore, followerPage]);

  useEffect(loadReviews, [loadReviews]);
  useEffect(loadFollowers, [loadFollowers]);

  if (!activeStore) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="font-sans text-2xl font-bold text-white">Đánh giá & Người theo dõi</h2>
        <p className="text-sm text-gray-400">Bạn cần tạo/chọn 1 gian hàng trước.</p>
      </div>
    );
  }

  const reviewColumns: Column<ReviewItem>[] = [
    {
      header: "Sản phẩm",
      render: (r) => <span className="text-gray-200">{r.product?.name ?? "—"}</span>,
    },
    {
      header: "Khách hàng",
      render: (r) => (
        <div>
          <div className="text-gray-300">{r.user?.name}</div>
          <div className="text-xs text-gray-500">{r.user?.email}</div>
        </div>
      ),
    },
    {
      header: "Đánh giá",
      align: "center",
      render: (r) => <Stars value={r.rating} />,
    },
    {
      header: "Nhận xét",
      render: (r) => <span className="line-clamp-2 max-w-xs text-gray-400">{r.comment ?? "—"}</span>,
    },
    {
      header: "Đã mua hàng",
      align: "center",
      render: (r) =>
        r.is_verified_purchase ? (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">Đã mua</span>
        ) : (
          <span className="text-xs text-gray-500">—</span>
        ),
    },
    {
      header: "Ngày gửi",
      render: (r) => <span className="whitespace-nowrap text-xs text-gray-400">{formatDate(r.created_at)}</span>,
    },
  ];

  const followerColumns: Column<StoreFollowerItem>[] = [
    {
      header: "Khách hàng",
      render: (f) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="text-gray-200">{f.user?.name}</div>
            <div className="text-xs text-gray-500">{f.user?.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "SĐT",
      render: (f) => <span className="text-gray-400">{f.user?.phone ?? "—"}</span>,
    },
    {
      header: "Ngày theo dõi",
      render: (f) => <span className="whitespace-nowrap text-xs text-gray-400">{formatDate(f.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">Đánh giá & Người theo dõi</h2>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("reviews")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "reviews" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Đánh giá sản phẩm {stats ? `(${stats.count})` : ""}
        </button>
        <button
          onClick={() => setTab("followers")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "followers" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Người theo dõi ({followerTotal})
        </button>
      </div>

      {tab === "reviews" ? (
        <>
          {stats && (
            <div className="flex items-center gap-4 rounded-xl border border-gray-800 bg-white/[0.02] px-5 py-4">
              <div className="text-3xl font-bold text-white">{stats.average.toFixed(1)}</div>
              <Stars value={Math.round(stats.average)} />
              <span className="text-sm text-gray-400">{stats.count} đánh giá</span>
            </div>
          )}
          <DataTable
            title="Đánh Giá Sản Phẩm"
            subtitle="Khách hàng đánh giá các sản phẩm trong gian hàng của bạn — chỉ xem."
            data={reviews}
            columns={reviewColumns}
            rowKey={(r) => r.id}
            currentPage={reviewPage}
            totalPages={reviewTotalPages}
            totalItems={reviewTotal}
            onPageChange={setReviewPage}
            filters={
              <div className="flex flex-wrap gap-2">
                {["", 5, 4, 3, 2, 1].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      setRatingFilter(star as number | "");
                      setReviewPage(1);
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      ratingFilter === star ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {star === "" ? "Tất cả" : `${star} sao`}
                  </button>
                ))}
              </div>
            }
          />
        </>
      ) : (
        <DataTable
          title="Người Theo Dõi Gian Hàng"
          subtitle="Khách hàng đang theo dõi gian hàng của bạn."
          data={followers}
          columns={followerColumns}
          rowKey={(f) => f.id}
          currentPage={followerPage}
          totalPages={followerTotalPages}
          totalItems={followerTotal}
          onPageChange={setFollowerPage}
        />
      )}
    </div>
  );
}
