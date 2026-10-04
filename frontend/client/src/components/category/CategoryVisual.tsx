import { resolveCategoryIcon } from "../../libs/categoryIcon";
import { type Category } from "../../types/product";

interface CategoryVisualProps {
  category: Pick<Category, "icon" | "color" | "display_type" | "image" | "name">;
  size?: number;
  className?: string;
  color?: string;
}

export function CategoryVisual({ category, size = 20, className, color }: CategoryVisualProps) {
  if (category.display_type === "image" && category.image) {
    return (
      <img
        src={category.image}
        alt={category.name}
        className="size-full rounded-lg object-cover"
      />
    );
  }

  const Icon = resolveCategoryIcon(category.icon);
  const resolvedColor = color ?? category.color;
  return (
    <Icon
      size={size}
      className={className}
      style={resolvedColor ? { color: resolvedColor } : undefined}
    />
  );
}
