import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Heart, Loader2, Trash2 } from "lucide-react";
import { formatPrice } from "../../libs/format";
import {
  getWishlist,
  removeFromWishlist,
  setWishlistTarget,
  type WishlistItem,
} from "../../services/wishlist";

function WishlistRow({
  item,
  onRemove,
  onChanged,
}: {
  item: WishlistItem;
  onRemove: (id: number) => void;
  onChanged: () => void;
}) {
  const [target, setTarget] = useState(item.target_price != null ? String(item.target_price) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setWishlistTarget(item.product_id, target.trim() === "" ? null : Number(target));
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:p-4">
      <Link to={`/san-pham/${item.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
        {item.image ? (
          <img src={item.image} alt={item.name} className="size-16 shrink-0 rounded-lg object-contain" />
        ) : (
          <div className="size-16 shrink-0 rounded-lg bg-gray-50" />
        )}
        <div className="min-w-0">
          <p className="line-clamp-2 font-sans text-[14px] font-semibold text-gray-800">{item.name}</p>
          <p className="mt-0.5 font-sans text-[14px] font-bold text-primary500">
            {formatPrice(item.current_price)}
            {item.discount_percent > 0 && (
              <span className="ml-2 text-[12px] font-normal text-gray-400 line-through">
                {formatPrice(item.price)}
              </span>
            )}
          </p>
          {item.target_reached && (
            <p className="font-sans text-[12px] font-semibold text-emerald-600">Đã đạt giá mong muốn!</p>
          )}
          {!item.in_stock && <p className="font-sans text-[12px] text-rose-500">Tạm hết hàng</p>}
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <div className="relative">
          <BellRing className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            min={0}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Báo khi giá ≤"
            className="w-36 rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 font-sans text-[13px] outline-none focus:border-primary500"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary500 px-3 py-1.5 font-sans text-[13px] font-semibold text-white disabled:opacity-60"
        >
          Lưu
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.product_id)}
          aria-label="Bỏ yêu thích"
          className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function WishlistTab() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getWishlist()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (productId: number) => {
    await removeFromWishlist(productId);
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Heart className="size-5 text-primary500" />
        <h2 className="font-sans text-[16px] font-bold text-gray-800">Sản phẩm yêu thích</h2>
      </div>
      <p className="font-sans text-[13px] text-gray-500">
        Đặt mức giá mong muốn, ShopTech sẽ gửi email ngay khi sản phẩm giảm xuống mức đó.
      </p>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center font-sans text-[13px] text-gray-400">
          Bạn chưa có sản phẩm yêu thích nào. Bấm biểu tượng trái tim trên sản phẩm để lưu lại.
        </p>
      ) : (
        items.map((item) => (
          <WishlistRow key={item.product_id} item={item} onRemove={remove} onChanged={load} />
        ))
      )}
    </div>
  );
}

export default WishlistTab;
