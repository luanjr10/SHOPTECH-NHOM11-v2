import { Link } from "react-router-dom";
import { StoreLogo } from "./StoreLogo";
import { type StoreRef } from "../../types/product";

interface StoreBadgeProps {
  store: StoreRef;
  asLink?: boolean;
  logoSize?: number;
  className?: string;
}

export function StoreBadge({
  store,
  asLink = false,
  logoSize = 24,
  className = "",
}: StoreBadgeProps) {
  const content = (
    <>
      <StoreLogo name={store.name} logo={store.logo} size={logoSize} />
      <span className="truncate font-sans text-[13px] font-medium text-gray-600 group-hover/store:text-primary500">
        {store.name}
      </span>
    </>
  );

  const base = `group/store flex min-w-0 items-center gap-1.5 ${className}`;

  if (asLink) {
    return (
      <Link
        to={`/gian-hang/${store.slug}`}
        className={`${base} cursor-pointer`}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </Link>
    );
  }

  return <div className={base}>{content}</div>;
}
