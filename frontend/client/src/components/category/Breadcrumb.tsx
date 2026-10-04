import { Link } from "react-router-dom";
import { House, ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-1 font-sans text-[13px] text-gray-500">
      <Link
        to="/"
        className="flex items-center gap-1 transition-colors hover:text-primary500"
      >
        <House className="size-4" />
        <span>Trang chủ</span>
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          <ChevronRight className="size-4 text-gray-300" />
          {item.to ? (
            <Link to={item.to} className="hover:text-primary500">
              {item.label}
            </Link>
          ) : (
            <span className="line-clamp-1 font-medium text-gray-700">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
