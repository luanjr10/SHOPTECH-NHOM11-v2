import { Link } from "react-router-dom";
import { ChevronRight, CircleUserRound, Gift, GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const eduDeals = [
  { label: "Deal hot", highlight: "học sinh sinh viên" },
  { label: "Laptop", highlight: "ưu đãi khủng" },
  { label: "Đăng Ký", highlight: "Nhận Ưu Đãi" },
];

function TabIntroduce() {
  const { user } = useAuth();

  return (
    <div className="flex h-full w-52 shrink-0 flex-col gap-3">
      <div className="shrink-0 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.35)]">
        {user ? (
          <Link to="/tai-khoan" className="flex flex-row items-center gap-2">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="size-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary500/10 text-primary500">
                <CircleUserRound className="size-5" />
              </div>
            )}
            <span className="truncate font-sans text-[13px] font-semibold leading-5">
              Chào, {user.name}
            </span>
          </Link>
        ) : (
          <div className="flex flex-row items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary500 to-primary300 p-1">
              <img
                src="https://cdn2.cellphones.com.vn/insecure/rs:fill:0:0/q:50/plain/https://cellphones.com.vn/media/wysiwyg/ant-smile.png"
                alt="Logo Introduce"
                className="size-3.5"
              />
            </div>
            <span className="font-sans text-[13px] font-semibold leading-5">
              Chào mừng bạn đến với ShopTech
            </span>
          </div>
        )}

        <p className="mt-2 font-sans text-[12px] leading-4 text-gray-500">
          {user
            ? "Quản lý tài khoản, đơn hàng và ưu đãi của bạn."
            : "Nhập hội thành viên Smember để không bỏ lỡ các ưu đãi hấp dẫn."}
        </p>

        {!user && (
          <div className="mt-2 flex flex-row items-center gap-1.5 font-sans text-[13px] whitespace-nowrap">
            <Link to="/login" className="cursor-pointer font-semibold text-primary500 hover:underline">
              Đăng Nhập
            </Link>
            <span className="text-gray-400">Hoặc</span>
            <Link to="/register" className="cursor-pointer font-semibold text-primary500 hover:underline">
              Đăng Ký
            </Link>
          </div>
        )}

        <a className="group mt-2 flex flex-row items-center gap-1 cursor-pointer">
          <Gift className="size-5 text-primary500" />
          <span className="whitespace-nowrap font-sans text-[12px] group-hover:text-primary500">
            Xem Ưu Đãi Smember
          </span>
          <ChevronRight className="size-4 text-woodsmoke transition-transform group-hover:translate-x-0.5 group-hover:text-primary500" />
        </a>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.35)]">
        <div className="rounded-lg bg-primary200 py-1 text-center font-sans text-[13px] font-semibold">
          Ưu Đãi Cho Giáo Dục
        </div>
        <div className="flex flex-col gap-1.5">
          {eduDeals.map((deal) => (
            <a
              key={deal.highlight}
              className="flex flex-row items-center gap-1.5 font-sans text-[12px] cursor-pointer hover:text-primary500"
            >
              <GraduationCap className="size-4 shrink-0 text-primary500" />
              <span className="truncate">
                {deal.label} <b>{deal.highlight}</b>
              </span>
            </a>
          ))}
        </div>

        <a href="" className="mt-auto block overflow-hidden rounded-lg">
          <img
            src="https://cdn2.cellphones.com.vn/x/media/wysiwyg/Web/landing-page/hang-moi-ve/promotion_banner04.png"
            alt="Khuyến mãi"
            className="w-full transition-transform duration-300 hover:scale-[1.02]"
          />
        </a>
      </div>
    </div>
  );
}

export default TabIntroduce;
