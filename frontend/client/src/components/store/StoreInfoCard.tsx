import { Link } from "react-router-dom";
import { ChevronRight, Store as StoreIcon } from "lucide-react";
import { StoreLogo } from "./StoreLogo";
import { type StoreRef } from "../../types/product";

interface StoreInfoCardProps {
  store: StoreRef;
}

export function StoreInfoCard({ store }: StoreInfoCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <StoreLogo name={store.name} logo={store.logo} size={52} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[12px] text-gray-400">
          <StoreIcon className="size-3.5" />
          Gian hàng
        </div>
        <div className="truncate font-sans text-[15px] font-bold text-gray-800">
          {store.name}
        </div>
      </div>

      <Link
        to={`/gian-hang/${store.slug}`}
        className="flex shrink-0 items-center gap-1 rounded-full border border-primary500 px-4 py-2 font-sans text-[13px] font-semibold text-primary500 transition-colors hover:bg-primary500 hover:text-white"
      >
        Xem gian hàng
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
