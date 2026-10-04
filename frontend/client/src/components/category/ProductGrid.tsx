import { ChevronDown, Loader2, PackageOpen } from "lucide-react";
import { ProductCard } from "../products/ProductCard/ProductCard";
import { ProductCardSkeleton } from "../products/ProductCard/ProductCardSkeleton";
import { type Product } from "../../types/product";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
}

export function ProductGrid({
  products,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  emptyMessage,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 text-gray-400">
        <PackageOpen size={40} strokeWidth={1.5} />
        <p className="font-sans text-[14px]">
          {emptyMessage ?? "Chưa có sản phẩm nào trong danh mục này"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
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
              Xem tiếp
              <ChevronDown className="size-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
