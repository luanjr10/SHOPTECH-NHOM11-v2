import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Check,
  Loader2,
  MessagesSquare,
  Plus,
  Recycle,
  ShoppingBag,
  ShieldCheck,
  Share2,
  Star,
  Users,
  Package,
} from "lucide-react";
import { StoreLogo } from "./StoreLogo";
import { type Store } from "../../types/product";
import { toggleFollowStore } from "../../services/catalog";
import { useAuth } from "../../context/AuthContext";

interface StoreProfileHeaderProps {
  store: Store;
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Star;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
      <Icon className="size-5 shrink-0 text-primary500" />
      <div className="min-w-0">
        <div className="truncate font-sans text-[15px] font-bold text-gray-800">
          {value}
        </div>
        <div className="truncate font-sans text-[12px] text-gray-500">
          {label}
        </div>
      </div>
    </div>
  );
}

export function StoreProfileHeader({ store }: StoreProfileHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(!!store.is_following);
  const [followersCount, setFollowersCount] = useState(store.stats?.followers ?? 0);
  const [followLoading, setFollowLoading] = useState(false);
  const stats = store.stats;
  const rating = stats?.rating ?? 0;

  const handleToggleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    try {
      const result = await toggleFollowStore(store.slug);
      setFollowing(result.following);
      setFollowersCount(result.followers_count);
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <div className="relative h-40 bg-linear-to-br from-gray-900 via-gray-800 to-primary500/60 sm:h-48">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(215,0,24,0.35),transparent_45%)]" />

        <div className="absolute right-3 top-3 flex flex-wrap items-center justify-end gap-2 sm:right-4 sm:top-4">
          <button
            type="button"
            onClick={handleToggleFollow}
            disabled={!user || followLoading}
            title={!user ? "Đăng nhập để theo dõi gian hàng" : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans sm:px-3.5 sm:py-2 text-[13px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${
              following
                ? "bg-white/20 text-white"
                : "bg-primary500 text-white hover:bg-primary300"
            }`}
          >
            {followLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : following ? (
              <Check className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {following ? "Đang theo dõi" : "Theo dõi"}
          </button>
          <button aria-label="Chia sẻ" className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 font-sans text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-white/25 cursor-pointer sm:px-3.5 sm:py-2">
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Chia sẻ</span>
          </button>
          <Link
            to={`/thu-cu-doi-moi?store=${store.id}`}
            aria-label="Thu cũ đổi mới"
            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 font-sans text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-white/25 cursor-pointer sm:px-3.5 sm:py-2"
          >
            <Recycle className="size-4" />
            <span className="hidden sm:inline">Thu cũ đổi mới</span>
          </Link>
          <button
            type="button"
            aria-label="Chat ngay"
            onClick={() => navigate(user ? `/tai-khoan/tin-nhan?store=${store.id}` : "/login")}
            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 font-sans text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-white/25 cursor-pointer sm:px-3.5 sm:py-2"
          >
            <MessagesSquare className="size-4" />
            <span className="hidden sm:inline">Chat ngay</span>
          </button>
        </div>

        <div className="absolute bottom-12 left-4 right-4 text-white sm:bottom-4 sm:pl-40">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="line-clamp-1 font-sans text-[21px] font-bold text-white drop-shadow sm:text-[26px]">
              {store.name}
            </h1>
            <BadgeCheck className="size-5 shrink-0 text-primary300 sm:size-6" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-white/80">/{store.slug}</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -top-10 left-3 origin-top-left scale-[0.62] rounded-full bg-white p-1.5 shadow-lg sm:-top-16 sm:left-5 sm:scale-100">
          <StoreLogo name={store.name} logo={store.logo} size={112} />
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-[96px] pr-3 pt-2 sm:pl-40 sm:pr-5 sm:pt-3">
          <span className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-sans text-[12px] font-semibold text-amber-600">
            <ShoppingBag className="size-3.5" />
            {stats?.seller_level ?? "New Seller"}
          </span>
          <span className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-sans text-[12px] font-semibold text-emerald-600">
            <ShieldCheck className="size-3.5" />
            Bảo hành 1 ngày
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 divide-gray-100 border-t border-gray-100 max-sm:[&>*:nth-child(odd)]:border-r max-sm:[&>*:nth-child(-n+2)]:border-b [&>*]:border-gray-100 sm:mt-3 sm:flex sm:flex-wrap sm:items-center sm:divide-x sm:pl-40">
          <Stat
            icon={Star}
            value={rating.toFixed(1)}
            label={`${stats?.rating_count ?? 0} đánh giá`}
          />
          <Stat
            icon={Users}
            value={followersCount}
            label="người theo dõi"
          />
          <Stat
            icon={Package}
            value={stats?.products_count ?? store.products_count ?? 0}
            label="sản phẩm"
          />
          <Stat
            icon={ShoppingBag}
            value={stats?.completed_orders ?? 0}
            label="đơn hoàn thành"
          />
        </div>
      </div>
    </div>
  );
}
