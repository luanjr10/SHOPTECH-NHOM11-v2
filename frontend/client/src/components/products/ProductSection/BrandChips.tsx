import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "../../ui/carousel";
import { type Brand } from "../../../types/product";

interface BrandChipsProps {
  brands: Brand[];
  loading?: boolean;
  selectedBrandId: number | null;
  onSelect: (brandId: number | null) => void;
}

export function BrandChips({
  brands,
  loading,
  selectedBrandId,
  onSelect,
}: BrandChipsProps) {
  if (loading) {
    return (
      <div className="mt-2 flex flex-row items-center gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 shrink-0 animate-pulse rounded-xl bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex min-w-0 flex-row items-center">
      <Carousel className="min-w-0 flex-1">
        <CarouselContent className="ml-0 gap-2">
          {brands.map((brand) => {
            const isActive = brand.id === selectedBrandId;
            return (
              <CarouselItem key={brand.id} className="basis-auto pl-0">
                <button
                  type="button"
                  onClick={() => onSelect(isActive ? null : brand.id)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-xl border px-3 font-sans text-[13px] whitespace-nowrap transition-colors cursor-pointer sm:text-[14px]",
                    isActive
                      ? "border-primary500 bg-primary300/15 text-primary500 font-semibold"
                      : "border-gray-200 hover:border-primary300 hover:bg-primary200",
                  )}
                >
                  {brand.logo && (
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="h-4 w-4 rounded-full object-cover"
                    />
                  )}
                  {brand.name}
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
      <div className="pl-3">
        <a className="flex flex-row items-center whitespace-nowrap font-sans text-[12px] text-blue-600 cursor-pointer hover:underline">
          <span>Xem tất cả</span>
          <ChevronRight size={18} />
        </a>
      </div>
    </div>
  );
}
