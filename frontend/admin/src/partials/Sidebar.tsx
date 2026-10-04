import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Users,
  UserRound,
  Flame,
  Store,
  ShoppingBag,
  ClipboardList,
  Star,
  Percent,
  Ticket,
  Wallet,
  Landmark,
  Settings,
  Boxes,
  TrendingUp,
  Banknote,
  RotateCcw,
  ChevronsLeft,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../services/auth.services";

interface SideBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  variant?: "default" | "v2" | "v3";
}

interface NavItemDef {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  module?: string;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItemDef[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Tổng quan",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    title: "Quản lý",
    items: [
      { to: "/products", label: "Sản phẩm", icon: Package, module: "products" },
      { to: "/categories", label: "Danh mục", icon: FolderTree, module: "categories" },
      { to: "/brands", label: "Thương hiệu", icon: Tag, module: "brands" },
      { to: "/employee", label: "Nhân viên", icon: Users, adminOnly: true },
      { to: "/customers", label: "Khách hàng", icon: UserRound, module: "customers" },
      { to: "/home-highlights", label: "Nổi bật trang chủ", icon: Flame, module: "home_highlights" },
    ],
  },
  {
    title: "Sàn TMĐT",
    items: [
      { to: "/sellers", label: "Người bán", icon: Store, module: "seller_applications" },
      { to: "/stores", label: "Gian hàng", icon: ShoppingBag, module: "stores" },
      { to: "/orders", label: "Đơn hàng & Hóa đơn", icon: ClipboardList, module: "orders" },
      { to: "/reviews", label: "Đánh giá & Theo dõi", icon: Star, module: "reviews" },
      { to: "/commissions", label: "Hoa hồng", icon: Percent, module: "commissions" },
      { to: "/vouchers", label: "Voucher", icon: Ticket, module: "vouchers" },
      { to: "/withdrawals", label: "Rút tiền", icon: Wallet, module: "withdrawals" },
      { to: "/platform-funds", label: "Quỹ sàn", icon: Landmark, module: "platform_funds" },
    ],
  },
  {
    title: "Khác",
    items: [{ to: "/settings", label: "Cài đặt", icon: Settings }],
  },
];

const SELLER_SECTIONS: NavSection[] = [
  {
    title: "Tổng quan",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    title: "Kênh người bán",
    items: [
      { to: "/seller/stores", label: "Gian hàng", icon: Store },
      { to: "/seller/products", label: "Sản phẩm", icon: Package },
      { to: "/seller/orders", label: "Đơn hàng & Hóa đơn", icon: ShoppingBag },
      { to: "/seller/customers", label: "Khách hàng", icon: UserRound },
      { to: "/seller/returns", label: "Hoàn trả / Bảo hành", icon: RotateCcw },
      { to: "/seller/reviews", label: "Đánh giá & Theo dõi", icon: Star },
      { to: "/seller/inventory", label: "Kho hàng", icon: Boxes },
      { to: "/seller/revenue", label: "Doanh thu", icon: TrendingUp },
      { to: "/seller/wallet", label: "Ví", icon: Wallet },
      { to: "/seller/withdrawals", label: "Rút tiền", icon: Banknote },
    ],
  },
  {
    title: "Khác",
    items: [{ to: "/settings", label: "Cài đặt", icon: Settings }],
  },
];

function NavItem({ item }: { item: NavItemDef }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        end={item.end}
        to={item.to}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150 ${
            isActive
              ? "bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/40 dark:hover:text-gray-100"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-violet-500 transition-opacity ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="whitespace-nowrap text-sm font-medium duration-200 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100">
              {item.label}
            </span>
          </>
        )}
      </NavLink>
    </li>
  );
}

function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  variant = "default",
}: SideBarProps) {
  const location = useLocation();
  const { pathname } = location;
  const { user } = useAuth();

  // Nhân viên chỉ thấy các mục được cấp quyền xem; quản lý nhân viên chỉ dành cho admin.
  const sections: NavSection[] =
    user?.role === "seller"
      ? SELLER_SECTIONS
      : user?.role === "employee"
      ? SECTIONS
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => {
              if (item.adminOnly) return false;
              if (item.module) return hasPermission(user, item.module, "view");
              return true;
            }),
          }))
          .filter((section) => section.items.length > 0)
      : SECTIONS;

  const trigger = useRef(null);
  const sidebar = useRef(null);

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true",
  );

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", sidebarExpanded);
    if (sidebarExpanded) {
      document.querySelector("body").classList.add("sidebar-expanded");
    } else {
      document.querySelector("body").classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  return (
    <div className="min-w-fit">
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      ></div>

      <div
        id="sidebar"
        ref={sidebar}
        className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 2xl:w-64! shrink-0 bg-white dark:bg-gray-800 p-4 transition-all duration-200 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-64"} ${variant === "v2" ? "border-r border-gray-200 dark:border-gray-700/60" : "rounded-r-2xl shadow-xs"}`}
      >
        <div className="flex justify-between mb-8 pr-3 sm:px-2">
          <button
            ref={trigger}
            className="lg:hidden text-gray-500 hover:text-gray-400"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg
              className="w-6 h-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>
          <NavLink end to="/" className="flex items-center gap-2.5">
            <svg
              className="fill-violet-500 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              width={32}
              height={32}
            >
              <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
            </svg>
            <span className="text-lg font-bold text-gray-800 dark:text-white whitespace-nowrap lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
              ShopTech
            </span>
          </NavLink>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="pl-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <span
                  className="hidden w-6 text-center lg:block lg:sidebar-expanded:hidden 2xl:hidden"
                  aria-hidden="true"
                >
                  •••
                </span>
                <span className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                  {section.title}
                </span>
              </h3>
              <ul className="mt-2 space-y-1">
                {section.items.map((item) => (
                  <NavItem key={item.to} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-auto hidden justify-end pt-3 lg:inline-flex 2xl:hidden">
          <div className="w-12 px-3 py-2">
            <button
              className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              title="Thu gọn / mở rộng"
            >
              <span className="sr-only">Expand / collapse sidebar</span>
              <ChevronsLeft className="h-5 w-5 shrink-0 sidebar-expanded:rotate-180 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
