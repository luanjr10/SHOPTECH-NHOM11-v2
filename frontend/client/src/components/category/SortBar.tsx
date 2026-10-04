import { ArrowDownWideNarrow, ArrowUpNarrowWide, Flame } from "lucide-react";
import { cn } from "cn";
import { type ProductSort } from "../../types/product";

interface SortOption {
  value: ProductSort;
  label: string;
  icon: typeof Flame;
}

const SORT_OPTIONS: SortOption[] = [
  { value: "discount_desc", label: "Giảm giá nhiều", icon: Flame },
  { value: "price_asc", label: "Giá Thấp - Cao", icon: ArrowUpNarrowWide },
  { value: "price_desc", label: "Giá Cao - Thấp", icon: ArrowDownWideNarrow },
];

interface SortBarProps {
  value: ProductSort;
  onChange: (value: ProductSort) => void;
}

export function SortBar({ value, onChange }: SortBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-sans text-[18px] font-bold text-gray-800">
        Sắp xếp theo
      </span>
      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((option) => {
          const isActive = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-4 py-2 font-sans text-[13px] font-medium transition-colors cursor-pointer",
                isActive
                  ? "border-primary500 bg-primary500 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-primary300 hover:text-primary500",
              )}
            >
              <Icon className="size-4" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
