import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Check,
  Clock,
  Loader2,
  LogIn,
  Store,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getMySellerApplications,
  submitSellerApplication,
} from "../services/seller";
import { getCategories } from "../services/catalog";
import { ADMIN_URL, type ApiError } from "../libs/api";
import { type SellerApplication } from "../types/auth";
import { type Category } from "../types/product";

const SELLER_CENTER_URL = ADMIN_URL;

const BENEFITS = [
  "Tiếp cận hàng nghìn khách hàng mỗi ngày",
  "Trang quản lý gian hàng riêng, theo dõi đơn & doanh thu",
  "Ví người bán, rút tiền linh hoạt",
];

function SellerRegister() {
  const { user, loading: authLoading, isSeller } = useAuth();

  const [apps, setApps] = useState<SellerApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  const [form, setForm] = useState({ shop_name: "", phone: "", address: "" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SellerApplication | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((error) => console.error("Không tải được danh mục:", error));
  }, []);

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    if (!user || isSeller) {
      setLoadingApps(false);
      return;
    }

    let ignore = false;
    getMySellerApplications()
      .then((data) => {
        if (!ignore) setApps(data);
      })
      .finally(() => {
        if (!ignore) setLoadingApps(false);
      });

    return () => {
      ignore = true;
    };
  }, [user, isSeller]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    setSubmitting(true);

    try {
      const app = await submitSellerApplication({
        shop_name: form.shop_name,
        phone: form.phone || undefined,
        address: form.address || undefined,
        category_ids: selectedCategoryIds,
      });
      setSubmitted(app);
    } catch (err) {
      const apiErr = err as ApiError;
      const payload = apiErr?.payload as { errors?: Record<string, string[]> };
      if (payload?.errors) {
        setErrors(payload.errors);
      } else {
        setMessage(apiErr?.message ?? "Gửi đơn thất bại, vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pendingApp =
    submitted ?? apps.find((a) => a.status === "pending") ?? null;
  const rejectedApp = apps.find((a) => a.status === "rejected") ?? null;

  const renderBody = () => {
    if (authLoading) {
      return (
        <div className="flex justify-center py-10 text-gray-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-50 p-4 sm:p-6 text-center">
          <LogIn className="size-8 text-primary500" />
          <p className="font-sans text-[14px] text-gray-600">
            Bạn cần đăng nhập để đăng ký mở gian hàng.
          </p>
          <div className="flex gap-2">
            <Link
              to="/login"
              className="rounded-lg bg-primary500 px-5 py-2 font-sans text-[14px] font-semibold text-white hover:bg-primary300"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-gray-200 px-5 py-2 font-sans text-[14px] font-semibold text-gray-700 hover:border-primary300"
            >
              Đăng ký tài khoản
            </Link>
          </div>
        </div>
      );
    }

    if (isSeller) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-green-50 p-4 sm:p-6 text-center">
          <BadgeCheck className="size-8 text-green-600" />
          <p className="font-sans text-[15px] font-semibold text-gray-800">
            Bạn đã là người bán 🎉
          </p>
          <p className="font-sans text-[13px] text-gray-500">
            Đăng nhập vào Seller Center để quản lý gian hàng của bạn.
          </p>
          <a
            href={SELLER_CENTER_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-primary500 px-5 py-2 font-sans text-[14px] font-semibold text-white hover:bg-primary300"
          >
            Vào trang quản lý gian hàng
          </a>
        </div>
      );
    }

    if (loadingApps) {
      return (
        <div className="flex justify-center py-10 text-gray-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      );
    }

    if (pendingApp) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-amber-50 p-4 sm:p-6 text-center">
          <Clock className="size-8 text-amber-500" />
          <p className="font-sans text-[15px] font-semibold text-gray-800">
            Đơn đăng ký đang chờ duyệt
          </p>
          <p className="font-sans text-[13px] text-gray-500">
            Gian hàng dự kiến: <b>{pendingApp.shop_name}</b>. Quản trị viên sẽ
            xét duyệt sớm. Sau khi được duyệt, bạn có thể đăng nhập vào Seller
            Center để quản lý gian hàng.
          </p>
        </div>
      );
    }

    return (
      <>
        {rejectedApp && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary500/10 px-3 py-2 font-sans text-[13px] text-primary500">
            <XCircle className="size-4 shrink-0" />
            Đơn trước đã bị từ chối. Bạn có thể gửi lại đơn mới.
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg bg-primary500/10 px-3 py-2 font-sans text-[13px] text-primary500">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
              Tên gian hàng dự kiến <span className="text-primary500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.shop_name}
              onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
              placeholder="VD: TechZone Mobile"
              className={`w-full rounded-lg border px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500 ${
                errors.shop_name ? "border-primary500" : "border-gray-200"
              }`}
            />
            {errors.shop_name && (
              <p className="mt-1 font-sans text-[12px] text-primary500">
                {errors.shop_name[0]}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
              Số điện thoại
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
              }
              placeholder="09xxxxxxxx"
              className={`w-full rounded-lg border px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500 ${
                errors.phone ? "border-primary500" : "border-gray-200"
              }`}
            />
            {errors.phone && (
              <p className="mt-1 font-sans text-[12px] text-primary500">{errors.phone[0]}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
              Địa chỉ
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Địa chỉ kinh doanh"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500"
            />
          </div>

          <div>
            <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
              Danh mục kinh doanh <span className="text-primary500">*</span>
            </label>
            <p className="mb-2 font-sans text-[12px] text-gray-400">
              Chọn (các) danh mục sản phẩm bạn muốn kinh doanh trên ShopTech.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((cat) => {
                const active = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left font-sans text-[13px] transition-colors cursor-pointer ${
                      active
                        ? "border-primary500 bg-primary500/10 text-primary500 font-semibold"
                        : "border-gray-200 text-gray-600 hover:border-primary300"
                    }`}
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                        active
                          ? "border-primary500 bg-primary500 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
            {errors.category_ids && (
              <p className="mt-1 font-sans text-[12px] text-primary500">
                {errors.category_ids[0]}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-primary500 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-60 cursor-pointer"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Gửi đơn đăng ký
          </button>
        </form>
      </>
    );
  };

  return (
    <div className="mx-auto grid w-full max-w-[1000px] grid-cols-1 gap-6 px-3 py-4 sm:px-4 sm:py-8 lg:grid-cols-2">
      <div className="flex flex-col justify-center gap-4 rounded-2xl bg-linear-to-br from-primary500 to-primary300 p-5 sm:p-8 text-white">
        <Store className="size-10" />
        <h1 className="font-sans text-[21px] sm:text-[26px] font-bold leading-tight !text-[#ffffff]">
          Trở thành người bán trên ShopTech
        </h1>
        <p className="font-sans text-[14px] text-white/90">
          Mở gian hàng miễn phí, bắt đầu kinh doanh cùng hàng nghìn khách hàng.
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 font-sans text-[14px]">
              <BadgeCheck className="mt-0.5 size-5 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.35)]">
        <h2 className="mb-4 font-sans text-[18px] font-bold text-gray-800">
          Đăng ký mở gian hàng
        </h2>
        {renderBody()}
      </div>
    </div>
  );
}

export default SellerRegister;
