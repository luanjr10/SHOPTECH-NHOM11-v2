import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { type Product } from "../../../types/product";
import { formatPrice } from "../../../libs/format";
import { StoreBadge } from "../../store/StoreBadge";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.discount_percent > 0;
  const finalPrice = product.final_price || product.price;

  return (
    <Link
      to={`/san-pham/${product.slug}`}
      className="group relative flex h-full flex-col items-center rounded-2xl border border-gray-100/60 bg-white p-2 text-left sm:p-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary300/40 hover:shadow-[0_8px_24px_rgba(215,0,24,0.12)] cursor-pointer">
      {hasDiscount && (
        <span className="absolute -top-1.5 left-2 rounded-r-xl rounded-bl-md bg-primary500 px-2 py-0.5 font-sans text-[12px] font-semibold text-white before:absolute before:-left-1 before:top-0 before:border-t-[4px] before:border-r-[4px] before:border-b-[4px] before:border-t-transparent before:border-r-red-900 before:border-b-transparent before:content-['']">
          Giảm {product.discount_percent}%
        </span>
      )}

      <div className="flex w-full shrink-0 justify-center overflow-hidden py-3 sm:py-4">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            loading="lazy"
            className="size-[110px] object-contain sm:size-[140px] transition-transform duration-300 ease-in-out group-hover:scale-110"
          />
        ) : (
          <div className="flex size-[110px] items-center sm:size-[140px] justify-center rounded-xl bg-gray-50 text-[11px] text-gray-300">
            Không có ảnh
          </div>
        )}
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col justify-between text-center font-sans">
        <div>
          {product.store && (
            <div className="mb-1.5 flex w-full items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1">
              <StoreBadge store={product.store} logoSize={18} />
            </div>
          )}

          <h3 className="line-clamp-2 min-h-[36px] text-[13px] font-bold sm:min-h-[40px] sm:text-[14px] leading-snug text-gray-800 group-hover:text-primary500">
            {product.name}
          </h3>

          <div className="my-1 flex flex-wrap items-baseline justify-center gap-x-2">
            <span className="text-[14px] font-bold text-primary500 sm:text-[15px]">
              {formatPrice(finalPrice)}
            </span>
            {hasDiscount && (
              <span className="text-[12px] text-gray-400 line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <div className="my-1 inline-block rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600">
            Smember giảm đến 90%
          </div>

          <div className="mt-1 hidden rounded-md bg-gray-100 p-1.5 sm:block text-[10px] leading-tight text-gray-600">
            Trả góp 0% - 0đ phụ phí - 0đ trả trước - kỳ hạn đến 12 tháng
          </div>
        </div>

        <div className="mt-3 flex w-full shrink-0 items-center justify-between pt-2 text-[12px] text-gray-500">
          <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
            <span>🚚 2 Giờ</span>
            <span className="ml-1 text-yellow-500">★ 5</span>
          </div>
          <button
            type="button"
            aria-label="Yêu thích"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="text-gray-400 transition-colors hover:text-primary500"
          >
            <Heart size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
}
