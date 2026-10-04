import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { getCategoriesWithChildren } from "../../services/catalog";
import { CategoryVisual } from "../category/CategoryVisual";
import { type Category } from "../../types/product";

function TabCategory({ onNavigate }: { onNavigate?: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    getCategoriesWithChildren()
      .then((data) => {
        if (!ignore) setCategories(data);
      })
      .catch((error) => console.error("Không tải được danh mục:", error))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="flex w-48 shrink-0 flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 font-sans text-[15px] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.35)]">
      {loading
        ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))
        : categories.map((category) => {
            const children = category.children ?? [];
            const hasChildren = children.length > 0;

            return (
              <div key={category.id} className="group/item relative">
                <Link
                  to={`/danh-muc/${category.slug}`}
                  onClick={onNavigate}
                  className="group flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 transition-colors hover:bg-primary200"
                >
                  <span className="flex size-5.5 shrink-0 items-center justify-center">
                    <CategoryVisual category={category} size={22} color="#d70018" />
                  </span>
                  <span className="flex-1 truncate font-medium text-gray-700 group-hover:text-primary500">
                    {category.name}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-woodsmoke transition-transform group-hover:translate-x-0.5 group-hover:text-primary500" />
                </Link>

                {hasChildren && (
                  <div className="invisible absolute left-full top-0 z-30 hidden pl-2 lg:block opacity-0 transition-opacity duration-150 group-hover/item:visible group-hover/item:opacity-100">
                    <div className="grid w-[360px] grid-cols-2 gap-1 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_12px_32px_rgba(0,0,0,0.15)]">
                      <div className="col-span-2 mb-1 flex items-center gap-2 border-b border-gray-100 pb-2">
                        <span className="flex size-4 shrink-0 items-center justify-center">
                          <CategoryVisual category={category} size={16} color="#d70018" />
                        </span>
                        <span className="text-[13px] font-bold text-gray-800">
                          {category.name}
                        </span>
                      </div>
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          to={`/danh-muc/${child.slug}`}
                          onClick={onNavigate}
                          className="group/child flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-primary200"
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md">
                            <CategoryVisual
                              category={child}
                              size={16}
                              color="#d70018"
                              className="group-hover/child:text-primary500"
                            />
                          </span>
                          <span className="truncate text-[12.5px] text-gray-600 group-hover/child:text-primary500">
                            {child.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
    </div>
  );
}

export default TabCategory;
