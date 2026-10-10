import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Link2, Loader2, Search, Store as StoreIcon, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../libs/format";
import { buildAffiliateLink } from "../libs/referral";
import {
  getAffiliateProducts,
  getAffiliateSummary,
  type AffiliateProduct,
  type AffiliateProductPage,
} from "../services/affiliate";

const PER_PAGE = 12;

function AffiliatePage() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [meta, setMeta] = useState<AffiliateProductPage["meta"] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setCode(null);
      return;
    }
    getAffiliateSummary()
      .then((s) => setCode(s.referral_code))
      .catch(() => setCode(null));
  }, [user]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    getAffiliateProducts({ search: search || undefined, page: 1, per_page: PER_PAGE })
      .then((res) => {
        if (ignore) return;
        setProducts(res.data);
        setMeta(res.meta);
        setPage(1);
      })
      .catch((error) => console.error("Không tải được sản phẩm affiliate:", error))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [search]);

  const handleLoadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    getAffiliateProducts({ search: search || undefined, page: next, per_page: PER_PAGE })
      .then((res) => {
        setProducts((prev) => [...prev, ...res.data]);
        setMeta(res.meta);
        setPage(next);
      })
      .catch((error) => console.error("Không tải thêm được sản phẩm:", error))
      .finally(() => setLoadingMore(false));
  };

  const copyLink = async (product: AffiliateProduct) => {
    if (!code) return;
    await navigator.clipboard.writeText(buildAffiliateLink(product.slug, code));
    setCopiedId(product.id);
    setTimeout(() => setCopiedId((current) => (current === product.id ? null : current)), 2000);
  };

  const hasMore = meta ? page < meta.last_page : false;

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6 px-3 py-4 sm:px-4 sm:py-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary500 to-red-700 px-6 py-8 text-white shadow-[0_8px_28px_rgba(215,0,24,0.25)] sm:px-10 sm:py-10">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Link2 className="size-6" />
            </span>
            <div>
              <h1 className="font-sans text-[19px] font-extrabold sm:text-[26px] !text-[#ffffff]">
                Affiliate ShopTech
              </h1>
              <p className="font-sans text-[13px] text-white/80">
                Chọn sản phẩm gian hàng đang trả hoa hồng, lấy link gửi bạn bè — đơn hoàn thành là có tiền về ví, rút về MoMo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(keyword.trim());
              }}
              className="flex w-full max-w-lg items-center gap-2 rounded-full bg-white p-1.5 shadow-lg"
            >
              <Search className="ml-3 size-4 shrink-0 text-gray-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm sản phẩm affiliate..."
                className="min-w-0 flex-1 bg-transparent font-sans text-[14px] text-gray-700 outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="shrink-0 cursor-pointer rounded-full bg-primary500 px-5 py-2 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-red-700"
              >
                Tìm kiếm
              </button>
            </form>
            {user && (
              <Link
                to="/tai-khoan/gioi-thieu"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 font-sans text-[13px] font-semibold text-white backdrop-blur hover:bg-white/25"
              >
                <Wallet className="size-4" /> Ví affiliate của tôi
              </Link>
            )}
          </div>
        </div>
        <Link2 className="pointer-events-none absolute -right-6 -top-6 size-36 rotate-12 text-white/10" />
      </div>

      {!user && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-sans text-[13px] text-amber-700">
          <Link to="/login" className="font-semibold underline">
            Đăng nhập
          </Link>{" "}
          để lấy link giới thiệu và nhận hoa hồng.
        </p>
      )}

      <p className="font-sans text-[14px] text-gray-500">
        {meta ? `${meta.total} sản phẩm đang chạy affiliate` : "Đang tải..."}
        {search && <span> phù hợp với "{search}"</span>}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary500" />
        </div>
      ) : products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-10 text-center font-sans text-[14px] text-gray-400">
          Chưa có sản phẩm nào chạy affiliate. Hãy quay lại sau nhé.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <Link to={`/san-pham/${product.slug}`} className="relative block aspect-square bg-gray-50">
                {product.thumbnail ? (
                  <img src={product.thumbnail} alt={product.name} className="size-full object-contain p-3" loading="lazy" />
                ) : null}
                <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2.5 py-1 font-sans text-[11px] font-bold text-white">
                  Hoa hồng {product.rate}%
                </span>
              </Link>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <Link
                  to={`/san-pham/${product.slug}`}
                  className="line-clamp-2 font-sans text-[13px] font-semibold text-gray-800 hover:text-primary500"
                >
                  {product.name}
                </Link>
                <Link
                  to={`/gian-hang/${product.store.slug}`}
                  className="flex items-center gap-1 font-sans text-[11px] text-gray-500 hover:text-primary500"
                >
                  <StoreIcon className="size-3" /> {product.store.name}
                </Link>
                <p className="font-sans text-[15px] font-bold text-primary500">{formatPrice(product.price)}</p>
                <p className="font-sans text-[12px] font-semibold text-emerald-600">
                  Bạn nhận ~{formatPrice(product.commission_estimate)}/sản phẩm
                </p>
                {user ? (
                  <button
                    type="button"
                    onClick={() => copyLink(product)}
                    disabled={!code}
                    className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary500 px-3 py-2 font-sans text-[12px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {copiedId === product.id ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
                    {copiedId === product.id ? "Đã chép link" : "Sao chép link giới thiệu"}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="mt-auto inline-flex items-center justify-center rounded-lg border border-primary500 px-3 py-2 font-sans text-[12px] font-semibold text-primary500"
                  >
                    Đăng nhập để lấy link
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="mx-auto flex cursor-pointer items-center gap-2 rounded-full border border-primary500 px-6 py-2.5 font-sans text-[14px] font-semibold text-primary500 hover:bg-primary500/5 disabled:opacity-60"
        >
          {loadingMore && <Loader2 className="size-4 animate-spin" />} Xem thêm
        </button>
      )}
    </div>
  );
}

export default AffiliatePage;
