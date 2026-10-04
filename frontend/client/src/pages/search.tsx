import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { ProductGrid } from "../components/category/ProductGrid";
import { SortBar } from "../components/category/SortBar";
import { useLocationContext } from "../context/LocationContext";
import { getProducts } from "../services/catalog";
import { type PaginationMeta, type Product, type ProductSort } from "../types/product";

const PER_PAGE = 20;

function SearchPage() {
  const [searchParams] = useSearchParams();
  const keyword = (searchParams.get("q") ?? "").trim();
  const { selectedProvince } = useLocationContext();

  const [sort, setSort] = useState<ProductSort>("discount_desc");
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!keyword) {
      setProducts([]);
      setMeta(null);
      setLoading(false);
      return;
    }

    let ignore = false;
    setLoading(true);

    getProducts({ search: keyword, sort, provinceId: selectedProvince?.code, page: 1, perPage: PER_PAGE })
      .then(({ products: data, meta: metaData }) => {
        if (ignore) return;
        setProducts(data);
        setMeta(metaData);
        setPage(1);
      })
      .catch((error) => console.error("Không tìm kiếm được sản phẩm:", error))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [keyword, sort, selectedProvince]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);

    getProducts({ search: keyword, sort, provinceId: selectedProvince?.code, page: nextPage, perPage: PER_PAGE })
      .then(({ products: more, meta: metaData }) => {
        setProducts((prev) => [...prev, ...more]);
        setMeta(metaData);
        setPage(nextPage);
      })
      .catch((error) => console.error("Không tải thêm được sản phẩm:", error))
      .finally(() => setLoadingMore(false));
  };

  const hasMore = meta ? page < meta.last_page : false;

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6 px-3 py-4 sm:px-4 sm:py-6">
      <div>
        <h1 className="font-sans text-[20px] font-bold text-gray-800">
          Kết quả tìm kiếm cho "{keyword}"
        </h1>
        {!loading && meta && (
          <p className="mt-1 font-sans text-[13px] text-gray-500">
            Tìm thấy {meta.total} sản phẩm
          </p>
        )}
      </div>

      {!keyword ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 text-gray-400">
          <SearchX size={40} strokeWidth={1.5} />
          <p className="font-sans text-[14px]">Nhập từ khóa ở ô tìm kiếm để bắt đầu</p>
        </div>
      ) : (
        <>
          <SortBar value={sort} onChange={setSort} />

          <ProductGrid
            products={products}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            emptyMessage={`Không tìm thấy sản phẩm nào phù hợp với "${keyword}"`}
          />
        </>
      )}
    </div>
  );
}

export default SearchPage;
