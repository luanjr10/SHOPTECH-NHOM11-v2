import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Search, Store as StoreIcon } from "lucide-react";
import { StoreDirectoryCard } from "../components/store/StoreDirectoryCard";
import { useLocationContext } from "../context/LocationContext";
import { getStores } from "../services/catalog";
import { type PaginationMeta, type StoreListItem, type StoreSort } from "../types/product";

const PER_PAGE = 12;

const SORT_OPTIONS: { value: StoreSort; label: string }[] = [
  { value: "newest", label: "Mới tham gia" },
  { value: "products_desc", label: "Nhiều sản phẩm nhất" },
  { value: "followers_desc", label: "Nhiều người theo dõi nhất" },
  { value: "name_asc", label: "Tên: A đến Z" },
];

function StoresPage() {
  const { selectedProvince } = useLocationContext();
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<StoreSort>("newest");

  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    getStores({ search, sort, provinceId: selectedProvince?.code, page: 1, perPage: PER_PAGE })
      .then(({ stores: data, meta: metaData }) => {
        if (ignore) return;
        setStores(data);
        setMeta(metaData);
        setPage(1);
      })
      .catch((error) => console.error("Không tải được danh sách gian hàng:", error))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [search, sort, selectedProvince]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);

    getStores({ search, sort, provinceId: selectedProvince?.code, page: nextPage, perPage: PER_PAGE })
      .then(({ stores: more, meta: metaData }) => {
        setStores((prev) => [...prev, ...more]);
        setMeta(metaData);
        setPage(nextPage);
      })
      .catch((error) => console.error("Không tải thêm được gian hàng:", error))
      .finally(() => setLoadingMore(false));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(keyword.trim());
  };

  const hasMore = meta ? page < meta.last_page : false;

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6 px-3 py-4 sm:px-4 sm:py-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary500 to-red-700 px-6 py-8 text-white shadow-[0_8px_28px_rgba(215,0,24,0.25)] sm:px-10 sm:py-10">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <StoreIcon className="size-6" />
            </span>
            <div>
              <h1 className="font-sans text-[19px] sm:text-[22px] font-extrabold sm:text-[26px] !text-[#ffffff]">
                Kênh Người Bán
              </h1>
              <p className="font-sans text-[13px] text-white/80">
                Khám phá {meta?.total ?? "hàng trăm"} gian hàng chính hãng đang hoạt động trên ShopTech
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex w-full max-w-lg items-center gap-2 rounded-full bg-white p-1.5 shadow-lg"
          >
            <Search className="ml-3 size-4 shrink-0 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm gian hàng theo tên..."
              className="min-w-0 flex-1 bg-transparent font-sans text-[14px] text-gray-700 outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-primary500 px-5 py-2 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-red-700 cursor-pointer"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        <StoreIcon className="pointer-events-none absolute -right-6 -top-6 size-36 rotate-12 text-white/10" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-[14px] text-gray-500">
          {meta ? `${meta.total} gian hàng` : "Đang tải..."}
          {search && <span> phù hợp với "{search}"</span>}
          {selectedProvince && <span> tại {selectedProvince.name}</span>}
        </p>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as StoreSort)}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-9 font-sans text-[13px] font-medium text-gray-700 outline-none transition-colors hover:border-primary300"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex h-[220px] animate-pulse flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5"
            >
              <div className="size-[72px] rounded-full bg-gray-100" />
              <div className="h-4 w-24 rounded bg-gray-100" />
              <div className="h-3 w-32 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 text-gray-400">
          <StoreIcon size={40} strokeWidth={1.5} />
          <p className="font-sans text-[14px]">Không tìm thấy gian hàng nào phù hợp</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {stores.map((store) => (
              <StoreDirectoryCard key={store.id} store={store} />
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 rounded-full border border-primary500 px-8 py-2.5 font-sans text-[14px] font-semibold text-primary500 transition-colors hover:bg-primary500 hover:text-white disabled:opacity-60 cursor-pointer"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  Xem thêm gian hàng
                  <ChevronDown className="size-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default StoresPage;
