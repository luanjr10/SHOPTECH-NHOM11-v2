import { useEffect, useMemo, useState } from "react";
import { cn } from "cn";
import { ChevronRight, Flame } from "lucide-react";
import { ProductCard } from "../products/ProductCard/ProductCard";
import { ProductCardSkeleton } from "../products/ProductCard/ProductCardSkeleton";
import { CategoryVisual } from "../category/CategoryVisual";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "../ui/carousel";
import { getCategories, getProducts } from "../../services/catalog";
import { type Category, type Product } from "../../types/product";

type TabKey = "deal_shock" | "hot_trend" | "new_arrival";

const TABS: { key: TabKey; label: string }[] = [
  { key: "deal_shock", label: "Deal sốc mỗi ngày" },
  { key: "hot_trend", label: "Sản phẩm hot trend" },
  { key: "new_arrival", label: "Hàng mới về" },
];

function DailyDealsSection() {
  const [activeTab, setActiveTab] = useState<TabKey>("deal_shock");
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((error) => console.error("Không tải được danh mục:", error));
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const params =
      activeTab === "deal_shock"
        ? { sort: "discount_desc" as const }
        : activeTab === "hot_trend"
          ? { isFeatured: true }
          : {};

    getProducts({
      categoryId: activeCategoryId ?? undefined,
      perPage: 20,
      ...params,
    })
      .then(({ products: data }) => {
        if (!ignore) setProducts(data);
      })
      .catch((error) => {
        console.error("Không tải được sản phẩm:", error);
        if (!ignore) setProducts([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, activeCategoryId]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.status === 1),
    [categories],
  );

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setActiveCategoryId(null);
  };

  return (
    <div className="mt-2">
      <div className="flex items-end gap-1 px-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "relative z-10 flex-1 rounded-t-xl border px-1.5 py-2 text-center font-sans text-[11px] font-extrabold uppercase leading-tight tracking-wide transition-colors sm:rounded-t-2xl sm:px-4 sm:py-3 sm:text-[16px]",
                isActive
                  ? "-mb-px border-blue-500 border-b-white bg-white text-blue-600"
                  : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100",
              )}
            >
              {tab.key === "hot_trend" ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      "hidden rounded-full px-3 py-1 text-[13px] font-extrabold tracking-wide sm:inline",
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                        : "text-gray-400",
                    )}
                  >
                    SẢN PHẨM
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-white shadow-sm sm:px-2.5 sm:py-1 sm:text-[12px]",
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-primary500"
                        : "bg-gray-300",
                    )}
                  >
                    <Flame size={13} className="fill-current" />
                    HOT TREND
                  </span>
                </span>
              ) : (
                tab.label
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl rounded-tl-none border-2 border-blue-500 bg-gradient-to-b from-blue-50/40 to-white p-2.5 sm:p-4">
        <div className="-mx-2.5 flex gap-2 overflow-x-auto px-2.5 pb-3 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveCategoryId(null)}
            className={cn(
              "shrink-0 rounded-full border-2 px-3 py-1.5 font-sans text-[12px] font-bold whitespace-nowrap uppercase transition-colors sm:px-4 sm:py-2 sm:text-[13px]",
              activeCategoryId === null
                ? "border-blue-500 bg-white text-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.15)]"
                : "border-transparent bg-white text-gray-500 hover:border-gray-200",
            )}
          >
            Tất cả
          </button>
          {visibleCategories.map((category) => {
            const isActive = activeCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border-2 px-3 py-1.5 font-sans text-[12px] font-bold whitespace-nowrap uppercase transition-colors sm:px-4 sm:py-2 sm:text-[13px]",
                  isActive
                    ? "border-blue-500 bg-white text-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.15)]"
                    : "border-transparent bg-white text-gray-500 hover:border-gray-200",
                )}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <CategoryVisual category={category} size={16} />
                </span>
                {category.name}
              </button>
            );
          })}
        </div>

        <Carousel opts={{ align: "start", dragFree: true }} className="sm:px-2">
          <CarouselContent className="-ml-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <CarouselItem key={i} className="basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/5">
                    <ProductCardSkeleton />
                  </CarouselItem>
                ))
              : products.map((product) => (
                  <CarouselItem
                    key={product.id}
                    className="basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/5"
                  >
                    <ProductCard product={product} />
                  </CarouselItem>
                ))}
          </CarouselContent>

          <CarouselPrevious className="-left-3 hidden size-11 sm:inline-flex border-2 border-gray-200 bg-white text-gray-500 shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:bg-gray-50 hover:text-blue-600 disabled:opacity-30 sm:-left-5" />
          <CarouselNext className="-right-3 hidden size-11 sm:inline-flex border-2 border-gray-200 bg-white text-gray-500 shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:bg-gray-50 hover:text-blue-600 disabled:opacity-30 sm:-right-5" />
        </Carousel>

        {!loading && products.length === 0 && (
          <p className="py-6 text-center font-sans text-[13px] text-gray-400">
            Chưa có sản phẩm nào phù hợp
          </p>
        )}

        <div className="mt-3 flex justify-center">
          <button className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-1.5 font-sans text-[13px] font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600">
            Xem tất cả
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DailyDealsSection;
