import { type Brand } from "../../types/product";

interface BrandGridProps {
  title: string;
  brands: Brand[];
  loading?: boolean;
  selectedBrandId: number | null;
  onSelect: (brandId: number | null) => void;
}

export function BrandGrid({
  title,
  brands,
  loading,
  selectedBrandId,
  onSelect,
}: BrandGridProps) {
  return (
    <section>
      <h2 className="mb-3 font-sans text-[20px] font-bold text-gray-800">
        {title}
      </h2>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-gray-100"
              />
            ))
          : brands.map((brand) => {
              const isActive = brand.id === selectedBrandId;
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => onSelect(isActive ? null : brand.id)}
                  title={brand.name}
                  className={`flex h-14 items-center justify-center rounded-xl border bg-white px-2 transition-all cursor-pointer ${
                    isActive
                      ? "border-primary500 ring-1 ring-primary500"
                      : "border-gray-200 hover:border-primary300 hover:shadow-sm"
                  }`}
                >
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      loading="lazy"
                      className="max-h-8 max-w-full object-contain"
                    />
                  ) : (
                    <span className="truncate text-[13px] font-semibold text-gray-700">
                      {brand.name}
                    </span>
                  )}
                </button>
              );
            })}
      </div>
    </section>
  );
}
