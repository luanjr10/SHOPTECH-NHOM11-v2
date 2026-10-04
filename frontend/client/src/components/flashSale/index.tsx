import { useEffect, useMemo, useState } from "react";
import { cn } from "cn";
import { Flame, Percent } from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";
import { ProductCard } from "../products/ProductCard/ProductCard";
import { ProductCardSkeleton } from "../products/ProductCard/ProductCardSkeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "../ui/carousel";
import {
  getCategories,
  getFlashSaleEndsAt,
  getProducts,
} from "../../services/catalog";
import { type Category, type Product } from "../../types/product";

const CATEGORY_GROUPS = [
  { label: "Điện thoại, Tablet", codes: ["CATE-02", "CATE-012"] },
  { label: "Laptop, PC, Phụ kiện", codes: ["CATE-01", "CAT-018", "CATE-06", "CATE-05", "CATE-04"] },
  { label: "Đồng hồ, Tai nghe", codes: ["CATE-019", "CATE-03"] },
];

const TOP_TABS = ["FLASHSALE", "SĂN DEAL CÔNG NGHỆ", "HOT SALE CUỐI TUẦN"];

function FlashSaleSection() {
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allFlashProducts, setAllFlashProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState(0);
  const [activeTopTab, setActiveTopTab] = useState(2);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      getFlashSaleEndsAt(),
      getCategories(),
      getProducts({ isFlashSale: true, perPage: 50, sort: "discount_desc" }),
    ])
      .then(([ends, cats, { products }]) => {
        if (ignore) return;
        setEndsAt(ends);
        setCategories(cats);
        setAllFlashProducts(products);
      })
      .catch((error) => console.error("Không tải được Flash sale:", error))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const groupCategoryIds = useMemo(() => {
    return CATEGORY_GROUPS.map((group) =>
      categories
        .filter((category) => group.codes.includes(category.code))
        .map((category) => category.id),
    );
  }, [categories]);

  const visibleProducts = useMemo(() => {
    const ids = groupCategoryIds[activeGroup] ?? [];
    if (ids.length === 0) return allFlashProducts;
    return allFlashProducts.filter((product) => ids.includes(product.category_id));
  }, [allFlashProducts, groupCategoryIds, activeGroup]);

  const isCountdownRunning = Boolean(endsAt) && new Date(endsAt as string).getTime() > Date.now();

  if (!loading && (!isCountdownRunning || allFlashProducts.length === 0)) {
    return null;
  }

  return (
    <div className="relative mt-2">
      <div className="absolute -top-3 -left-2 z-20 hidden h-9 w-9 sm:flex -rotate-12 items-center justify-center rounded-lg bg-yellow-400 shadow-[0_4px_10px_rgba(0,0,0,0.25)] ring-2 ring-white">
        <Percent size={16} className="text-primary500" strokeWidth={3} />
      </div>
      <div className="absolute -top-3 -right-2 z-20 hidden h-9 w-9 sm:flex rotate-12 items-center justify-center rounded-lg bg-yellow-400 shadow-[0_4px_10px_rgba(0,0,0,0.25)] ring-2 ring-white">
        <Percent size={16} className="text-primary500" strokeWidth={3} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-primary500 to-red-700 pt-2 shadow-[0_8px_28px_rgba(215,0,24,0.3)] ring-2 ring-yellow-300/80 ring-offset-2 ring-offset-white">
        <div className="flex flex-row px-2 sm:px-3">
          {TOP_TABS.map((tab, index) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTopTab(index)}
              className={cn(
                "flex-1 rounded-t-xl px-1.5 py-2 text-center font-sans text-[11px] font-extrabold uppercase leading-tight tracking-wide transition-colors sm:px-4 sm:py-3 sm:text-[15px]",
                activeTopTab === index
                  ? "bg-white text-primary500"
                  : "text-white/80 hover:text-white",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-white/10 p-2 backdrop-blur-sm sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_GROUPS.map((group, index) => (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => setActiveGroup(index)}
                  className={cn(
                    "rounded-full border px-3 py-1 font-sans text-[12px] font-semibold transition-colors sm:px-4 sm:py-1.5 sm:text-[13px]",
                    activeGroup === index
                      ? "border-white bg-white text-primary500"
                      : "border-white/50 text-white hover:bg-white/10",
                  )}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Flame size={16} className="text-white" />
              {endsAt && <CountdownTimer endsAt={endsAt} />}
            </div>
          </div>

          <Carousel opts={{ align: "start", dragFree: true }} className="mt-3 px-1">
            <CarouselContent className="-ml-3">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <CarouselItem key={i} className="basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/5">
                      <ProductCardSkeleton />
                    </CarouselItem>
                  ))
                : visibleProducts.map((product) => (
                    <CarouselItem
                      key={product.id}
                      className="basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/5"
                    >
                      <ProductCard product={product} />
                    </CarouselItem>
                  ))}
            </CarouselContent>

            {!loading && visibleProducts.length > 5 && (
              <>
                <CarouselPrevious className="-left-1 border-none bg-white text-primary500 shadow-[0_2px_10px_rgba(0,0,0,0.25)] hover:bg-white hover:text-primary500 disabled:opacity-0 sm:-left-2 lg:-left-4" />
                <CarouselNext className="-right-1 border-none bg-white text-primary500 shadow-[0_2px_10px_rgba(0,0,0,0.25)] hover:bg-white hover:text-primary500 disabled:opacity-0 sm:-right-2 lg:-right-4" />
              </>
            )}
          </Carousel>

          {!loading && visibleProducts.length === 0 && (
            <p className="py-6 text-center font-sans text-[13px] text-white/80">
              Chưa có sản phẩm flash sale ở danh mục này
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlashSaleSection;
