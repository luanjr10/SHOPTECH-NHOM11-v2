import { Link, useLocation } from "react-router-dom";
import { GitCompareArrows, X } from "lucide-react";
import { MAX_COMPARE, useCompare } from "../../context/CompareContext";

export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const { pathname } = useLocation();

  if (items.length === 0 || pathname === "/so-sanh") return null;

  const ids = items.map((i) => i.id).join(",");

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-3 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur sm:px-4">
      <div className="mx-auto flex max-w-[1220px] items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white py-1 pl-1 pr-7"
            >
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.name} className="size-9 rounded-lg object-contain" />
              ) : (
                <div className="size-9 rounded-lg bg-gray-100" />
              )}
              <span className="line-clamp-1 max-w-[110px] font-sans text-[12px] font-medium text-gray-700 sm:max-w-[160px]">
                {item.name}
              </span>
              <button
                type="button"
                aria-label="Bỏ khỏi so sánh"
                onClick={() => remove(item.id)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary500"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <span className="hidden shrink-0 font-sans text-[12px] text-gray-400 sm:inline">
            {items.length}/{MAX_COMPARE} sản phẩm
          </span>
        </div>
        <button
          type="button"
          onClick={clear}
          className="hidden shrink-0 font-sans text-[12px] text-gray-500 hover:text-primary500 sm:block"
        >
          Xóa hết
        </button>
        <Link
          to={`/so-sanh?ids=${ids}`}
          aria-disabled={items.length < 2}
          onClick={(e) => {
            if (items.length < 2) e.preventDefault();
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 font-sans text-[13px] font-bold text-white ${
            items.length < 2 ? "cursor-not-allowed bg-gray-300" : "bg-primary500 hover:bg-primary500/90"
          }`}
        >
          <GitCompareArrows className="size-4" />
          So sánh{items.length < 2 ? " (chọn thêm)" : ` (${items.length})`}
        </Link>
      </div>
    </div>
  );
}
