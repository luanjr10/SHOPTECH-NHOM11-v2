import { PackageOpen } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "../../ui/carousel";
import { ProductCard } from "../ProductCard/ProductCard";
import { ProductCardSkeleton } from "../ProductCard/ProductCardSkeleton";
import { type Product } from "../../../types/product";

interface ProductRowsProps {
  products: Product[];
  loading?: boolean;
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <Carousel className="flex w-full flex-1 flex-col [&>div]:h-full [&>div]:flex-1">
      <CarouselContent className="-ml-3 flex h-full flex-row overflow-visible py-3">
        {children}
      </CarouselContent>
    </Carousel>
  );
}

export function ProductRows({ products, loading }: ProductRowsProps) {
  if (loading) {
    return (
      <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between gap-2">
        {[0, 1].map((row) => (
          <Row key={row}>
            {Array.from({ length: 4 }).map((_, i) => (
              <CarouselItem key={i} className="h-full basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/4">
                <ProductCardSkeleton />
              </CarouselItem>
            ))}
          </Row>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mt-3 flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 text-gray-400">
        <PackageOpen size={40} strokeWidth={1.5} />
        <p className="font-sans text-[14px]">
          Chưa có sản phẩm nào trong danh mục này
        </p>
      </div>
    );
  }

  const half = Math.ceil(products.length / 2);
  const rows = [products.slice(0, half), products.slice(half)];

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between gap-2">
      {rows.map(
        (rowProducts, rowIndex) =>
          rowProducts.length > 0 && (
            <Row key={rowIndex}>
              {rowProducts.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="h-full basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/4"
                >
                  <ProductCard product={product} />
                </CarouselItem>
              ))}
            </Row>
          ),
      )}
    </div>
  );
}
