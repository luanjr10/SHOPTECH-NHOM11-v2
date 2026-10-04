import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { getCategories, getSubcategories } from "../../services/catalog";
import { CategoryVisual } from "../category/CategoryVisual";
import { type Category } from "../../types/product";

const PARENT_CODE = "CATE-06";

function TileSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-r border-neutral-100 px-3 py-4 last:border-r-0">
      <div className="size-10 shrink-0 animate-pulse rounded-xl bg-gray-100" />
      <div className="h-3.5 w-20 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

function TabMenu() {
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [parentSlug, setParentSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    getCategories()
      .then((categories) => {
        const parent = categories.find(
          (category) => category.code === PARENT_CODE,
        );
        if (!parent) return [];
        if (!ignore) setParentSlug(parent.slug);
        return getSubcategories(parent.id);
      })
      .then((children) => {
        if (!ignore && children) setSubcategories(children);
      })
      .catch((error) =>
        console.error("Không tải được danh mục phụ kiện:", error),
      )
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (!loading && subcategories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <div className="mt-5 flex flex-row items-center gap-3 font-sans sm:gap-4">
        <h3 className="text-[14px] font-bold uppercase text-gray-800 sm:text-[16px]">
          Sắm thêm phụ kiện chất lượng
        </h3>
        <span className="h-4 w-px bg-gray-200" />
        {parentSlug && (
          <Link
            to={`/danh-muc/${parentSlug}`}
            className="group flex flex-row items-center gap-0.5 rounded-lg text-[13px] font-medium text-blue-600 transition-colors hover:text-primary500"
          >
            Xem tất cả
            <ChevronRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_4px_20px_-8px_rgba(0,0,0,0.35)] sm:grid-cols-3 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 18 }).map((_, i) => <TileSkeleton key={i} />)
          : subcategories.slice(0, 18).map((sub) => (
              <Link
                key={sub.id}
                to={`/danh-muc/${sub.slug}`}
                className="group flex min-w-0 items-center gap-2 border-b border-r border-neutral-100 px-2.5 py-3 sm:gap-3 sm:px-3 sm:py-4 transition-colors hover:bg-primary200/40 max-sm:[&:nth-child(2n)]:border-r-0 sm:max-lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(6n)]:border-r-0"
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 transition-colors group-hover:bg-white">
                  <CategoryVisual
                    category={sub}
                    size={20}
                    className="text-gray-500 transition-colors group-hover:text-primary500"
                  />
                </span>
                <p className="truncate font-sans text-[13px] font-medium text-gray-700 group-hover:text-primary500">
                  {sub.name}
                </p>
              </Link>
            ))}
      </div>
    </div>
  );
}

export default TabMenu;
