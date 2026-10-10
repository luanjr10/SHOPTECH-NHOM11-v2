import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, MessageCircle, Store as StoreIcon } from "lucide-react";
import { StoreLogo } from "./StoreLogo";
import { type StoreRef } from "../../types/product";
import { useAuth } from "../../context/AuthContext";

interface StoreInfoCardProps {
  store: StoreRef;
  /** Slug sản phẩm đang xem, để gửi kèm khi chat với gian hàng. */
  productSlug?: string;
}

export function StoreInfoCard({ store, productSlug }: StoreInfoCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const openChat = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    const query = new URLSearchParams({ store: String(store.id) });
    if (productSlug) query.set("product", productSlug);
    navigate(`/tai-khoan/tin-nhan?${query.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
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

      <button
        type="button"
        onClick={openChat}
        className="flex shrink-0 items-center gap-1 rounded-full bg-primary500 px-4 py-2 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-primary500/90"
      >
        <MessageCircle className="size-4" />
        Chat ngay
      </button>

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
