import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";

const INFO_LINKS = [
  { label: "Giới thiệu ShopTech", to: "/contact" },
  { label: "Tuyển dụng", to: null },
  { label: "Tin công nghệ", to: null },
  { label: "Liên hệ", to: "/contact" },
];

const POLICY_LINKS = [
  { label: "Chính sách bảo hành", to: null },
  { label: "Chính sách đổi trả", to: null },
  { label: "Chính sách vận chuyển", to: null },
  { label: "Chính sách bảo mật", to: null },
];

const SUPPORT_LINKS = [
  { label: "Hướng dẫn mua hàng", to: null },
  { label: "Tra cứu đơn hàng", to: "/tai-khoan/don-hang" },
  { label: "Câu hỏi thường gặp", to: null },
  { label: "Kênh người bán", to: "/gian-hang" },
  { label: "Đăng ký mở gian hàng", to: "/dang-ky-ban-hang" },
];

const COMMITMENTS = [
  { icon: ShieldCheck, label: "Hàng chính hãng 100%" },
  { icon: Truck, label: "Giao nhanh 2 giờ" },
  { icon: RotateCcw, label: "Đổi trả trong 30 ngày" },
  { icon: BadgeCheck, label: "Bảo hành tận tâm" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; to: string | null }[];
}) {
  return (
    <div>
      <h3 className="font-sans text-[14px] font-bold uppercase tracking-wide text-white">
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) =>
          link.to ? (
            <li key={link.label}>
              <Link
                to={link.to}
                className="font-sans text-[13px] text-gray-400 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ) : (
            <li
              key={link.label}
              className="font-sans text-[13px] text-gray-400"
            >
              {link.label}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-10 bg-[#141821] text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto grid w-full max-w-[1220px] grid-cols-2 gap-3 px-4 py-5 sm:gap-4 sm:py-6 md:grid-cols-4">
          {COMMITMENTS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Icon className="size-5 text-primary300" />
              </span>
              <span className="font-sans text-[13px] font-medium text-gray-200">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1220px] grid-cols-2 gap-x-6 gap-y-8 px-4 py-8 sm:grid-cols-3 sm:py-10 lg:grid-cols-5">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <Link to="/" className="inline-block">
          </Link>
          <p className="mt-4 max-w-sm font-sans text-[13px] leading-relaxed text-gray-400">
            ShopTech — hệ thống bán lẻ công nghệ &amp; marketplace đa gian
            hàng, cam kết sản phẩm chính hãng, giá tốt và trải nghiệm mua sắm
            an tâm cho mọi khách hàng.
          </p>

          <ul className="mt-5 flex flex-col gap-3">
            <li className="flex items-start gap-2.5 font-sans text-[13px] text-gray-400">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary300" />
              Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội
            </li>
            <li className="flex items-center gap-2.5 font-sans text-[13px] text-gray-400">
              <Phone className="size-4 shrink-0 text-primary300" />
              1800 1968 (miễn phí)
            </li>
            <li className="flex items-center gap-2.5 font-sans text-[13px] text-gray-400">
              <Mail className="size-4 shrink-0 text-primary300" />
              hotro@shoptech.vn
            </li>
            <li className="flex items-center gap-2.5 font-sans text-[13px] text-gray-400">
              <Store className="size-4 shrink-0 text-primary300" />
              <Link to="/gian-hang" className="hover:text-white">
                Khám phá tất cả gian hàng trên sàn
              </Link>
            </li>
          </ul>
        </div>

        <FooterColumn title="Về ShopTech" links={INFO_LINKS} />
        <FooterColumn title="Chính sách" links={POLICY_LINKS} />
        <FooterColumn title="Hỗ trợ khách hàng" links={SUPPORT_LINKS} />
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1220px] flex-col items-center justify-between gap-3 px-4 py-5 font-sans text-[12px] text-gray-500 sm:flex-row">
          <p className="text-center sm:text-left">© {new Date().getFullYear()} ShopTech. Đồ án minh họa — không phải doanh nghiệp thật.</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Visa", "Mastercard", "MoMo", "VNPay", "COD"].map((method) => (
              <span
                key={method}
                className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-gray-400"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
