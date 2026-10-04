import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../libs/format";
import { type CartItemResponse } from "../types/cart";

function QuantityStepper({
  value,
  max,
  disabled,
  onChange,
}: {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        className="flex size-8 items-center justify-center text-gray-500 hover:text-primary500 disabled:opacity-40"
        aria-label="Giảm"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-9 text-center font-sans text-[14px] font-semibold">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="flex size-8 items-center justify-center text-gray-500 hover:text-primary500 disabled:opacity-40"
        aria-label="Tăng"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function CartRow({ item }: { item: CartItemResponse }) {
  const { updateItem, removeItem } = useCart();
  const [busy, setBusy] = useState(false);

  const handleQuantity = async (next: number) => {
    setBusy(true);
    try {
      await updateItem(item.id, next);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removeItem(item.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 py-4 last:border-none sm:flex-row sm:items-center sm:gap-4">
      <div className="flex flex-1 items-center gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
          {item.product?.thumbnail ? (
            <img
              src={item.product.thumbnail}
              alt={item.product.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-gray-300">
              <ShoppingCart className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 font-sans text-[14px] font-semibold text-gray-800">
            {item.product?.name ?? "Sản phẩm không còn tồn tại"}
          </p>
          {item.variant?.attributes && Object.keys(item.variant.attributes).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(item.variant.attributes).map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-full bg-gray-100 px-2 py-0.5 font-sans text-[11px] text-gray-500"
                >
                  {value}
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 font-sans text-[13px] font-semibold text-primary500">
            {formatPrice(item.unit_price)}
          </p>
          {item.unavailable && (
            <p className="mt-1 flex items-center gap-1 font-sans text-[12px] font-medium text-rose-500">
              <AlertTriangle className="size-3.5" /> Sản phẩm không còn hoạt động
            </p>
          )}
          {!item.unavailable && item.stock_insufficient && (
            <p className="mt-1 flex items-center gap-1 font-sans text-[12px] font-medium text-amber-600">
              <AlertTriangle className="size-3.5" /> Chỉ còn {item.available_stock} sản phẩm, vui lòng giảm số lượng
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <QuantityStepper
          value={item.quantity}
          max={Math.max(item.available_stock, 1)}
          disabled={busy || item.unavailable}
          onChange={handleQuantity}
        />
        <p className="text-right font-sans text-[15px] sm:w-28 font-bold text-gray-800">
          {formatPrice(item.subtotal)}
        </p>
        <button
          type="button"
          onClick={handleRemove}
          disabled={busy}
          className="text-gray-400 transition-colors hover:text-rose-500 disabled:opacity-40"
          aria-label="Xóa sản phẩm"
        >
          <Trash2 className="size-5" />
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { cart, loading, clear } = useCart();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  const items = cart?.items ?? [];
  const hasBlockingIssue = items.some((i) => i.unavailable || i.stock_insufficient);

  const handleClear = async () => {
    if (!window.confirm("Xóa toàn bộ giỏ hàng?")) return;
    setClearing(true);
    try {
      await clear();
    } finally {
      setClearing(false);
    }
  };

  if (loading && !cart) {
    return <div className="mx-auto max-w-[1000px] px-4 py-16 text-center text-gray-400">Đang tải giỏ hàng...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-4 px-4 py-20 text-center">
        <ShoppingCart className="size-16 text-gray-200" />
        <p className="font-sans text-[16px] font-semibold text-gray-700">
          Giỏ hàng của bạn đang trống
        </p>
        <Link
          to="/"
          className="rounded-xl bg-primary500 px-6 py-2.5 font-sans text-[14px] font-bold text-white transition-colors hover:bg-primary500/90"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] px-3 py-4 sm:px-4 sm:py-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-sans text-[19px] sm:text-[22px] font-bold text-gray-900">
          Giỏ hàng ({cart?.total_item ?? 0})
        </h1>
        <button
          type="button"
          onClick={handleClear}
          disabled={clearing}
          className="font-sans text-[13px] font-medium text-gray-500 underline-offset-2 hover:text-rose-500 hover:underline disabled:opacity-40"
        >
          Xóa tất cả
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white px-4 shadow-sm sm:px-5">
        {items.map((item) => (
          <CartRow key={item.id} item={item} />
        ))}
      </div>

      {hasBlockingIssue && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 font-sans text-[13px] font-medium text-amber-700">
          <AlertTriangle className="size-4 shrink-0" />
          Một số sản phẩm trong giỏ không còn đủ điều kiện thanh toán. Vui lòng điều
          chỉnh số lượng hoặc xóa trước khi tiếp tục.
        </div>
      )}

      <div className="sticky bottom-2 mt-6 flex flex-row items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-lg sm:bottom-4 sm:p-5">
        <div>
          <p className="font-sans text-[13px] text-gray-500">
            Tổng cộng ({cart?.total_quantity ?? 0} sản phẩm)
          </p>
          <p className="font-sans text-[20px] sm:text-[24px] font-bold text-primary500">
            {formatPrice(cart?.subtotal ?? 0)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/thanh-toan")}
          disabled={hasBlockingIssue}
          className="shrink-0 rounded-xl bg-primary500 px-4 py-3 font-sans text-[14px] font-bold sm:px-8 sm:text-[15px] text-white transition-colors hover:bg-primary500/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tiến hành thanh toán
        </button>
      </div>
    </div>
  );
}
