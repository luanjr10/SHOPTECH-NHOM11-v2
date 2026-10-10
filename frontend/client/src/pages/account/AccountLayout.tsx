import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  CircleUserRound,
  Coins,
  Gem,
  Heart,
  KeyRound,
  Landmark,
  MessageCircle,
  MapPin,
  MonitorSmartphone,
  PackageSearch,
  Recycle,
  Ticket,
  UserRound,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getLoyaltySummary } from "../../services/loyalty";
import { getUnreadCount } from "../../services/chat";
import type { LoyaltySummary } from "../../types/loyalty";

const navItems = [
  { to: "/tai-khoan", end: true, icon: UserRound, label: "Hồ sơ của tôi" },
  { to: "/tai-khoan/don-hang", icon: PackageSearch, label: "Đơn hàng của tôi" },
  { to: "/tai-khoan/uu-dai", icon: Ticket, label: "Hạng & Ưu đãi của tôi" },
  { to: "/tai-khoan/tin-nhan", icon: MessageCircle, label: "Tin nhắn" },
  { to: "/thu-cu-doi-moi", icon: Recycle, label: "Thu cũ đổi mới" },
  { to: "/tai-khoan/xu", icon: Coins, label: "ShopTech Xu" },
  { to: "/tai-khoan/tra-gop", icon: Landmark, label: "Trả góp của tôi" },
  { to: "/tai-khoan/yeu-thich", icon: Heart, label: "Sản phẩm yêu thích" },
  { to: "/tai-khoan/gioi-thieu", icon: Wallet, label: "Ví Affiliate" },
  { to: "/tai-khoan/dia-chi", icon: MapPin, label: "Địa chỉ giao hàng" },
  { to: "/tai-khoan/doi-mat-khau", icon: KeyRound, label: "Đổi mật khẩu" },
  {
    to: "/tai-khoan/phien-dang-nhap",
    icon: MonitorSmartphone,
    label: "Phiên đăng nhập",
  },
];

const TIER_STYLE: Record<string, string> = {
  dong: "bg-amber-100 text-amber-700",
  bac: "bg-slate-200 text-slate-700",
  vang: "bg-yellow-100 text-yellow-700",
  kim_cuong: "bg-cyan-100 text-cyan-700",
};

function AccountLayout() {
  const { user } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    const load = () => {
      if (!document.hidden) getUnreadCount().then(setUnreadChats).catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    getLoyaltySummary()
      .then(setLoyalty)
      .catch(() => setLoyalty(null));
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 py-4 sm:px-4 sm:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <aside className="w-full shrink-0 md:w-[260px]">
          <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm md:p-4">
            <div className="mb-3 flex items-center gap-3 border-b border-gray-100 pb-3 md:mb-4 md:pb-4">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="size-12 rounded-full object-cover ring-2 ring-primary500/20"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-full bg-primary500/10 text-primary500">
                  <CircleUserRound className="size-7" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-sans text-[14px] font-semibold text-gray-800">
                  {user?.name}
                </p>
                <p className="truncate font-sans text-[12px] text-gray-400">
                  @{user?.username}
                </p>
                {loyalty && (
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold ${
                      TIER_STYLE[loyalty.tier] ?? TIER_STYLE.dong
                    }`}
                  >
                    <Gem className="size-3" />
                    Hạng {loyalty.tier_label}
                  </span>
                )}
              </div>
            </div>

            <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] md:mx-0 md:flex-col md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
              {navItems.map(({ to, end, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 font-sans text-[13px] font-medium transition-colors md:gap-3 md:py-2.5 md:text-[14px] ${
                      isActive
                        ? "bg-primary500/10 text-primary500"
                        : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <Icon className="size-[18px]" />
                  {label}
                  {to.endsWith("tin-nhan") && unreadChats > 0 && (
                    <span className="ml-auto rounded-full bg-primary500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {unreadChats}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

export default AccountLayout;
