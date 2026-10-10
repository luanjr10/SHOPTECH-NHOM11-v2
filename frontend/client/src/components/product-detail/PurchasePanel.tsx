import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, GitCompareArrows, Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { MAX_COMPARE, useCompare } from "../../context/CompareContext";
import { VariantSelector } from "./VariantSelector";
import { type ProductDetail, type ProductVariant } from "../../types/product";
import { formatPrice } from "../../libs/format";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { PriceAlertBox } from "./PriceAlertBox";
import { InstallmentBadge } from "./InstallmentBadge";

interface PurchasePanelProps {
  product: ProductDetail;
}

export function PurchasePanel({ product }: PurchasePanelProps) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { isWished, toggle } = useWishlist();
  const wished = isWished(product.id);
  const { has: hasCompare, toggle: toggleCompare } = useCompare();
  const compared = hasCompare(product.id);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ProductVariant>(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelected(product.variants[0]);
    setQuantity(1);
    setFeedback(null);
  }, [product]);

  const currentPrice = selected?.price ?? product.final_price;
  const listPrice = product.price;
  const hasDiscount = listPrice > currentPrice;
  const discountPercent = useMemo(
    () =>
      hasDiscount ? Math.round((1 - currentPrice / listPrice) * 100) : 0,
    [hasDiscount, currentPrice, listPrice],
  );

  const inStock = (selected?.stock ?? 0) > 0;

  const showFeedback = (message: string) => {
    setFeedback(message);
    setError(null);
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const addSelectedToCart = async () => {
    if (!user) {
      navigate("/login");
      return false;
    }
    if (!inStock) return false;

    setSubmitting(true);
    setError(null);
    try {
      await addItem(product.id, selected.sku, quantity);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Thêm vào giỏ hàng thất bại";
      setError(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = async () => {
    if (await addSelectedToCart()) {
      showFeedback("Đã thêm vào giỏ hàng");
    }
  };

  const handleBuyNow = async () => {
    if (await addSelectedToCart()) {
      navigate("/gio-hang");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-sans text-[19px] sm:text-[22px] font-bold leading-snug text-gray-900">
          {product.name}
        </h1>
        <div className="mt-2 flex items-center gap-3 text-[13px] text-gray-500">
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="size-4 fill-amber-400 stroke-amber-400" />
            <span className="font-semibold text-gray-700">
              {(product.rating ?? 0).toFixed(1)}
            </span>
            <span className="text-gray-400">({product.reviews_count ?? 0} đánh giá)</span>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            SKU: <span className="font-medium text-gray-600">{selected?.sku}</span>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-primary500/15 bg-primary500/5 p-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-sans text-[20px] sm:text-[24px] sm:text-[28px] font-bold text-primary500">
            {formatPrice(currentPrice)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-[15px] text-gray-400 line-through">
                {formatPrice(listPrice)}
              </span>
              <span className="rounded-md bg-primary500 px-2 py-0.5 text-[12px] font-semibold text-white">
                -{discountPercent}%
              </span>
            </>
          )}
        </div>
        <p className="mt-1 font-sans text-[12px] text-gray-500">
          Đã bao gồm thuế VAT
        </p>
      </div>

      <InstallmentBadge storeId={product.store?.id ?? product.store_id} price={currentPrice} />

      {selected && (
        <VariantSelector
          variants={product.variants}
          selected={selected}
          onSelect={setSelected}
        />
      )}

      <div className="flex items-center gap-4">
        <span className="font-sans text-[13px] font-medium text-gray-500">
          Số lượng
        </span>
        <div className="flex items-center rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-9 items-center justify-center text-gray-500 hover:text-primary500 disabled:opacity-40"
            disabled={quantity <= 1}
            aria-label="Giảm"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center font-sans text-[14px] font-semibold">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              setQuantity((q) => Math.min(selected?.stock ?? 99, q + 1))
            }
            className="flex size-9 items-center justify-center text-gray-500 hover:text-primary500 disabled:opacity-40"
            disabled={quantity >= (selected?.stock ?? 99)}
            aria-label="Tăng"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <span
          className={`font-sans text-[13px] font-medium ${
            inStock ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {inStock ? `Còn hàng (${selected?.stock})` : "Tạm hết hàng"}
        </span>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 font-sans text-[13px] font-medium text-emerald-700">
          <Check className="size-4" /> {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 font-sans text-[13px] font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!inStock || submitting}
          className="flex flex-1 flex-col items-center justify-center rounded-xl bg-primary500 py-2.5 font-sans font-bold text-white transition-colors hover:bg-primary500/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-[15px]">MUA NGAY</span>
          <span className="text-[11px] font-normal opacity-90">
            Giao nhanh hoặc nhận tại cửa hàng
          </span>
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!inStock || submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary500 py-2.5 font-sans text-[15px] font-bold text-primary500 transition-colors hover:bg-primary500/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingCart className="size-5" />
          Thêm vào giỏ
        </button>
        <button
          type="button"
          aria-label={wished ? "Bỏ yêu thích" : "Yêu thích"}
          onClick={async () => {
            if (!(await toggle(product.id))) navigate("/login");
          }}
          className={`flex items-center justify-center rounded-xl border px-3 py-2.5 transition-colors hover:border-primary300 hover:text-primary500 ${
            wished ? "border-primary300 text-primary500" : "border-gray-200 text-gray-400"
          }`}
        >
          <Heart className={`size-5 ${wished ? "fill-primary500" : ""}`} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!toggleCompare({ id: product.id, name: product.name, thumbnail: product.images[0] ?? null })) {
            window.alert(`Chỉ so sánh được tối đa ${MAX_COMPARE} sản phẩm cùng lúc.`);
          }
        }}
        className={`flex items-center justify-center gap-2 rounded-xl border py-2 font-sans text-[13px] font-semibold transition-colors ${
          compared ? "border-primary500 bg-primary500/5 text-primary500" : "border-gray-200 text-gray-600 hover:border-primary300"
        }`}
      >
        <GitCompareArrows className="size-4" />
        {compared ? "Đã thêm vào so sánh" : "Thêm vào so sánh"}
      </button>

      {wished && <PriceAlertBox productId={product.id} currentPrice={currentPrice} />}
    </div>
  );
}
