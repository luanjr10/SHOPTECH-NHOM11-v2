import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../../ui/input-group";
import { Button } from "../../ui/button";
import {
  CircleUserRound,
  FileSearchCorner,
  Link2,
  LogOut,
  Phone,
  Search,
  ShoppingCart,
  Store,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import { CategoryMenu } from "./CategoryMenu";
import { LocationMenu } from "./LocationMenu";
import logo from "../../../assets/logo.png";
import { ADMIN_URL } from "../../../libs/api";

const marqueeText = "Thu cũ giá ngon - Lên đời tiết kiệm";

function Header() {
  const { user, isSeller, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const cartCount = cart?.total_quantity ?? 0;
  const [searchTerm, setSearchTerm] = useState("");

  const runSearch = () => {
    const keyword = searchTerm.trim();
    if (!keyword) return;
    navigate(`/tim-kiem?q=${encodeURIComponent(keyword)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  const goToCart = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/gio-hang");
  };

  const goToOrders = () => {
    navigate(user ? "/tai-khoan/don-hang" : "/login");
  };

  const utilityLinks = [
    { icon: FileSearchCorner, label: "Tra Cứu Đơn Hàng", onClick: goToOrders },
    { icon: Phone, label: "1800 1968", onClick: undefined },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 right-0 left-0 z-1000 flex flex-col items-center bg-linear-to-b from-primary500 to-primary300 text-white shadow-[0_4px_16px_rgba(215,0,24,0.25)]">
      <div className="w-full max-w-[1220px] px-3 sm:px-4">
        <div className="hidden flex-row items-center gap-6 border-b border-white/15 py-2 md:flex">
          <div className="relative flex-1 overflow-hidden">
            <div className="animate-scroll-left-infinite flex w-max gap-8 pr-8">
              {Array.from({ length: 2 }).map((_, copy) => (
                <ul
                  key={copy}
                  className="flex shrink-0 flex-row gap-8 font-sans text-[12px] whitespace-nowrap sm:text-[13px]"
                  aria-hidden={copy === 1}
                >
                  {Array.from({ length: 4 }).map((__, i) => (
                    <li key={i} className="font-semibold tracking-wide">
                      <Link to="/thu-cu-doi-moi" tabIndex={copy === 1 ? -1 : 0} className="hover:underline">
                        {marqueeText}
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>

          <div className="hidden items-center gap-4 font-sans text-[13px] md:flex">
            <Link
              to="/gian-hang"
              className="flex items-center gap-1.5 whitespace-nowrap font-semibold opacity-90 transition-opacity hover:opacity-100"
            >
              <Store className="size-4" />
              <span>Kênh người bán</span>
            </Link>
            <span className="h-3 w-px bg-white/30" />
            <Link
              to="/affiliate"
              className="flex items-center gap-1.5 whitespace-nowrap font-semibold opacity-90 transition-opacity hover:opacity-100"
            >
              <Link2 className="size-4" />
              <span>Affiliate</span>
            </Link>
            {utilityLinks.map(({ icon: Icon, label, onClick }) => (
              <div key={label} className="flex items-center gap-4">
                <span className="h-3 w-px bg-white/30" />
                <button
                  type="button"
                  onClick={onClick}
                  className="flex items-center gap-1.5 whitespace-nowrap opacity-90 transition-opacity hover:opacity-100 cursor-pointer"
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-2 py-2 sm:gap-x-3 lg:flex-nowrap lg:py-3">
          <Link to="/" title="ShopTech" className="order-1 shrink-0">
            <img
              src={logo}
              alt="ShopTechLogo"
              className="w-[112px] cursor-pointer transition-transform duration-300 hover:scale-95 sm:w-[140px] lg:w-[170px]"
            />
          </Link>

          <div className="order-3 h-0 basis-full lg:hidden" aria-hidden />

          <div className="order-4 shrink-0 lg:order-2">
            <CategoryMenu />
          </div>

          <LocationMenu className="order-4 lg:order-2" />

          <form
            onSubmit={handleSearchSubmit}
            className="order-4 min-w-0 flex-1 lg:order-2"
          >
            <InputGroup className="min-w-0 rounded-full border-none bg-white text-gray-600 shadow-sm">
              <InputGroupInput
                placeholder="Bạn muốn mua gì hôm nay?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
              />
              <InputGroupAddon>
                <button
                  type="submit"
                  aria-label="Tìm kiếm"
                  className="cursor-pointer text-primary500"
                >
                  <Search />
                </button>
              </InputGroupAddon>
            </InputGroup>
          </form>

          <div className="order-2 ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5 lg:order-3 lg:ml-0">
            <Button
              variant="ghost"
              onClick={goToCart}
              aria-label="Giỏ hàng"
              className="relative shrink-0 gap-1.5 hover:bg-white/20 hover:text-white cursor-pointer"
            >
              <ShoppingCart className="size-5" />
              <span className="hidden md:inline">Giỏ Hàng</span>
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-primary500 shadow-sm">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Button>

            {user ? (
              <>
                {isSeller ? (
                  <a
                    href={ADMIN_URL}
                    target="_blank"
                    rel="noreferrer"
                    title="Quản lý gian hàng"
                    className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 font-sans text-[13px] font-semibold text-primary500 transition-transform hover:scale-95 sm:px-3"
                  >
                    <Store className="size-4" />
                    <span className="hidden xl:inline">Quản lý gian hàng</span>
                  </a>
                ) : (
                  <Link
                    to="/dang-ky-ban-hang"
                    title="Đăng ký mở gian hàng"
                    className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 font-sans text-[13px] font-semibold text-primary500 transition-transform hover:scale-95 sm:px-3"
                  >
                    <Store className="size-4" />
                    <span className="hidden xl:inline">Đăng ký mở gian hàng</span>
                  </Link>
                )}
                <Link
                  to="/tai-khoan"
                  title="Tài khoản của tôi"
                  className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1.5 font-sans text-[14px] font-medium backdrop-blur transition-colors hover:bg-white/25 sm:px-3"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <CircleUserRound className="size-5" />
                  )}
                  <span className="hidden max-w-[110px] truncate md:inline">
                    {user.name}
                  </span>
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                  className="shrink-0 hover:bg-white/20 hover:text-white cursor-pointer"
                >
                  <LogOut className="size-5" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                className="shrink-0 gap-1.5 bg-white/15 backdrop-blur hover:bg-white/25 cursor-pointer"
              >
                <CircleUserRound className="size-5" />
                <span>Đăng Nhập</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
