import { type ProductVariant } from "../../types/product";
import { formatPrice } from "../../libs/format";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selected: ProductVariant;
  onSelect: (variant: ProductVariant) => void;
}

const ATTR_META = [
  { key: "color", label: "Màu sắc" },
  { key: "storage", label: "Phiên bản" },
  { key: "ram", label: "RAM" },
  { key: "cpu", label: "CPU" },
] as const;

type AttrKey = (typeof ATTR_META)[number]["key"];

export function VariantSelector({
  variants,
  selected,
  onSelect,
}: VariantSelectorProps) {
  const presentAttrs = ATTR_META.filter(({ key }) =>
    variants.some((variant) => (variant.attributes[key] ?? "") !== ""),
  );

  if (presentAttrs.length === 0) return null;

  const pickVariant = (attr: AttrKey, value: string): ProductVariant => {
    const candidates = variants.filter(
      (variant) => variant.attributes[attr] === value,
    );
    if (candidates.length === 0) return selected;

    const otherAttrs = presentAttrs.filter(({ key }) => key !== attr);
    let best = candidates[0];
    let bestScore = -1;

    for (const candidate of candidates) {
      const score = otherAttrs.reduce(
        (acc, { key }) =>
          candidate.attributes[key] === selected.attributes[key]
            ? acc + 1
            : acc,
        0,
      );
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return best;
  };

  return (
    <div className="flex flex-col gap-4">
      {presentAttrs.map(({ key, label }) => {
        const values: string[] = [];
        for (const variant of variants) {
          const value = variant.attributes[key];
          if (value && !values.includes(value)) values.push(value);
        }

        return (
          <div key={key}>
            <p className="mb-2 font-sans text-[13px] font-medium text-gray-500">
              {label}
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const active = selected.attributes[key] === value;
                const sample = variants.find(
                  (variant) => variant.attributes[key] === value,
                );

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onSelect(pickVariant(key, value))}
                    className={`flex min-w-[104px] flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-primary500 bg-primary500/5 ring-1 ring-primary500"
                        : "border-gray-200 bg-white hover:border-primary300"
                    }`}
                  >
                    <span className="font-sans text-[13px] font-semibold text-gray-800">
                      {value}
                    </span>
                    {key === "color" && sample && (
                      <span className="font-sans text-[12px] text-primary500">
                        {formatPrice(sample.price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
