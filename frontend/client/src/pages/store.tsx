import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, StoreIcon } from "lucide-react";
import { cn } from "cn";
import { Breadcrumb } from "../components/category/Breadcrumb";
import { SortBar } from "../components/category/SortBar";
import { ProductGrid } from "../components/category/ProductGrid";
import { StoreProfileHeader } from "../components/store/StoreProfileHeader";
import { StoreAbout } from "../components/store/StoreAbout";
import { StoreSellerInfo } from "../components/store/StoreSellerInfo";
import { StoreTrustCenter } from "../components/store/StoreTrustCenter";
import { getProducts, getStoreBySlug } from "../services/catalog";
import {
  type PaginationMeta,
  type Product,
  type ProductSort,
  type Store,
} from "../types/product";

const PER_PAGE = 20;

function StorePage() {
  const { slug } = useParams<{ slug: string }>();

  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [sort, setSort] = useState<ProductSort>("discount_desc");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let ignore = false;
    setLoadingStore(true);
    setNotFound(false);
    setCategoryId(null);
    window.scrollTo({ top: 0 });

    getStoreBySlug(slug)
      .then((data) => {
        if (!ignore) setStore(data);
      })
      .catch(() => {
        if (!ignore) {
          setStore(null);
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!ignore) setLoadingStore(false);
      });

    return () => {
      ignore = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!store) return;

    let ignore = false;
    setLoadingProducts(true);

    getProducts({
      storeId: store.id,
      categoryId: categoryId ?? undefined,
      sort,
      page: 1,
      perPage: PER_PAGE,
    })
      .then(({ products: data, meta: metaData }) => {
        if (ignore) return;
        setProducts(data);
        setMeta(metaData);
        setPage(1);
      })
      .catch(() => {
        if (!ignore) setProducts([]);
      })
      .finally(() => {
        if (!ignore) setLoadingProducts(false);
      });

    return () => {
      ignore = true;
    };
  }, [store, sort, categoryId]);

  const handleLoadMore = () => {
    if (!store) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    getProducts({
      storeId: store.id,
      categoryId: categoryId ?? undefined,
      sort,
      page: nextPage,
      perPage: PER_PAGE,
    })
      .then(({ products: more, meta: metaData }) => {
        setProducts((prev) => [...prev, ...more]);
        setMeta(metaData);
        setPage(nextPage);
      })
      .finally(() => setLoadingMore(false));
  };

  const hasMore = meta ? page < meta.last_page : false;

  if (loadingStore) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[1220px] items-center justify-center px-4">
        <Loader2 className="size-8 animate-spin text-primary500" />
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[1220px] flex-col items-center justify-center gap-4 px-4 text-gray-400">
        <StoreIcon size={48} strokeWidth={1.4} />
        <p className="font-sans text-[15px]">Không tìm thấy gian hàng</p>
        <Link
          to="/"
          className="rounded-full border border-primary500 px-6 py-2 font-sans text-[14px] font-semibold text-primary500 transition-colors hover:bg-primary500 hover:text-white"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  const categoryChips = store.categories ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6 px-3 py-3 sm:px-4 sm:py-4">
      <Breadcrumb items={[{ label: "Gian hàng" }, { label: store.name }]} />

      <StoreProfileHeader store={store} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StoreAbout store={store} />
        </div>
        <div className="flex flex-col gap-6">
          <StoreSellerInfo store={store} />
          <StoreTrustCenter store={store} />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-[18px] font-bold text-gray-800">
            Sản phẩm của shop
          </h2>
          <SortBar value={sort} onChange={setSort} />
        </div>

        {categoryChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors cursor-pointer",
                categoryId === null
                  ? "bg-primary500 text-white"
                  : "border border-gray-200 text-gray-600 hover:border-primary300",
              )}
            >
              Tất cả
            </button>
            {categoryChips.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors cursor-pointer",
                  categoryId === cat.id
                    ? "bg-primary500 text-white"
                    : "border border-gray-200 text-gray-600 hover:border-primary300",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <ProductGrid
          products={products}
          loading={loadingProducts}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
}

export default StorePage;
