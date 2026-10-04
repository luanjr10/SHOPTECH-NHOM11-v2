import { Link } from "react-router-dom";
import { Heart, Package, Star } from "lucide-react";
import { StoreLogo } from "./StoreLogo";
import { type StoreListItem } from "../../types/product";

interface StoreDirectoryCardProps {
  store: StoreListItem;
}

export function StoreDirectoryCard({ store }: StoreDirectoryCardProps) {
  return (
    <Link
      to={`/gian-hang/${store.slug}`}
      className="group flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-primary300/40 hover:shadow-[0_12px_28px_rgba(215,0,24,0.12)]"
    >
      <StoreLogo
        name={store.name}
        logo={store.logo}
        size={72}
        className="ring-4 ring-primary200/50 transition-transform duration-300 group-hover:scale-105"
      />

      <h3 className="mt-3 line-clamp-1 font-sans text-[15px] font-bold text-gray-800 group-hover:text-primary500">
        {store.name}
      </h3>

      <p className="mt-1 line-clamp-2 min-h-[36px] font-sans text-[12.5px] leading-tight text-gray-400">
        {store.description || "Gian hàng chính hãng trên ShopTech"}
      </p>

      <div className="mt-3 flex w-full items-center justify-center gap-3 border-t border-gray-100 pt-3 font-sans text-[12px] text-gray-500">
        <span className="flex items-center gap-1">
          <Star size={13} className="fill-yellow-400 text-yellow-400" />
          {store.rating > 0 ? store.rating.toFixed(1) : "Mới"}
        </span>
        <span className="h-3 w-px bg-gray-200" />
        <span className="flex items-center gap-1">
          <Package size={13} className="text-primary500" />
          {store.products_count} SP
        </span>
        <span className="h-3 w-px bg-gray-200" />
        <span className="flex items-center gap-1">
          <Heart size={13} className="text-primary500" />
          {store.followers_count}
        </span>
      </div>
    </Link>
  );
}
