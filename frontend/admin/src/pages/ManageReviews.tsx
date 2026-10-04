import { useCallback, useEffect, useState } from "react";
import { Star, Trash, User } from "lucide-react";
import { ToastContainer } from "react-toastify";
import Swal from "sweetalert2";
import { notifyError, notifySuccess } from "../helpers/notify";
import { deleteAdminReview, getAdminReviews, getAdminStoreFollows } from "../services/marketplace.services";
import { formatDate } from "../helpers/formatDate";
import DataTable, { Column } from "../components/common/DataTable";
import type { ReviewItem, StoreFollowerItem } from "../types/review.types";
import { useModulePermission } from "../hooks/useModulePermission";

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-700"}`} />
      ))}
    </div>
  );
}

export default function ManageReviewsPage() {
  const [tab, setTab] = useState<"reviews" | "followers">("reviews");

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [ratingFilter, setRatingFilter] = useState<number | "">("");
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);

  const [followers, setFollowers] = useState<StoreFollowerItem[]>([]);
  const [followerSearch, setFollowerSearch] = useState("");
  const [followerPage, setFollowerPage] = useState(1);
  const [followerTotalPages, setFollowerTotalPages] = useState(1);
  const [followerTotal, setFollowerTotal] = useState(0);
  const { canDelete } = useModulePermission("reviews");

  const loadReviews = useCallback(() => {
    getAdminReviews({ rating: (ratingFilter || undefined) as number | undefined, page: reviewPage })
      .then((res) => {
        const page = res?.data;
        setReviews(page?.data ?? []);
        setReviewTotalPages(page?.last_page ?? 1);
        setReviewTotal(page?.total ?? 0);
      })
      .catch(() => notifyError("Không tải được danh sách đánh giá"));
  }, [ratingFilter, reviewPage]);

  const loadFollowers = useCallback(() => {
    getAdminStoreFollows({ search: followerSearch || undefined, page: followerPage })
      .then((res) => {
        const page = res?.data;
        setFollowers(page?.data ?? []);
        setFollowerTotalPages(page?.last_page ?? 1);
        setFollowerTotal(page?.total ?? 0);
      })
      .catch(() => notifyError("Không tải được danh sách người theo dõi"));
  }, [followerSearch, followerPage]);

  useEffect(loadReviews, [loadReviews]);
  useEffect(loadFollowers, [loadFollowers]);

  const handleDelete = (review: ReviewItem) => {
    Swal.fire({
      title: "Xoá đánh giá này?",
      text: "Dùng khi đánh giá spam hoặc vi phạm — không thể hoàn tác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#3085d6",
      cancelButtonText: "Hủy bỏ",
      confirmButtonText: "Xoá",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await deleteAdminReview(review.id);
        notifySuccess("Đã xoá đánh giá");
        loadReviews();
      } catch {
        notifyError("Xoá đánh giá thất bại");
      }
    });
  };

  const reviewColumns: Column<ReviewItem>[] = [
    {
      header: "Sản phẩm",
      render: (r) => (
        <div>
          <div className="text-gray-200">{r.product?.name ?? "—"}</div>
          <div className="text-xs text-gray-500">{r.product?.store?.name}</div>
        </div>
      ),
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
    { header: "Đánh giá", align: "center", render: (r) => <Stars value={r.rating} /> },
    {
      header: "Nhận xét",
      render: (r) => <span className="line-clamp-2 max-w-xs text-gray-400">{r.comment ?? "—"}</span>,
    },
    {
      header: "Ngày gửi",
      render: (r) => <span className="whitespace-nowrap text-xs text-gray-400">{formatDate(r.created_at)}</span>,
    },
    {
      header: "Thao tác",
      align: "center",
      render: (r) =>
        canDelete ? (
          <button
            type="button"
            title="Xoá đánh giá"
            onClick={() => handleDelete(r)}
            className="cursor-pointer p-1 text-gray-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          >
            <Trash className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        ),
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
      header: "Gian hàng",
      render: (f) => <span className="text-gray-300">{f.store?.name ?? "—"}</span>,
    },
    {
      header: "Ngày theo dõi",
      render: (f) => <span className="whitespace-nowrap text-xs text-gray-400">{formatDate(f.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">Đánh Giá & Người Theo Dõi</h2>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("reviews")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "reviews" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Đánh giá sản phẩm ({reviewTotal})
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
        <DataTable
          title="Đánh Giá Sản Phẩm Toàn Sàn"
          subtitle="Kiểm duyệt đánh giá — xoá khi phát hiện spam hoặc vi phạm."
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
      ) : (
        <DataTable
          title="Người Theo Dõi Gian Hàng"
          subtitle="Toàn bộ lượt theo dõi gian hàng trên sàn."
          data={followers}
          columns={followerColumns}
          rowKey={(f) => f.id}
          currentPage={followerPage}
          totalPages={followerTotalPages}
          totalItems={followerTotal}
          onPageChange={setFollowerPage}
          searchValue={followerSearch}
          onSearch={(v) => {
            setFollowerSearch(v);
            setFollowerPage(1);
          }}
        />
      )}

      <ToastContainer />
    </div>
  );
}
