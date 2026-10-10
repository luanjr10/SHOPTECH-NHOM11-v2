import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { formatPrice } from "../../libs/format";
import { getWishlist, setWishlistTarget } from "../../services/wishlist";

interface PriceAlertBoxProps {
  productId: number;
  currentPrice: number;
}

export function PriceAlertBox({ productId, currentPrice }: PriceAlertBoxProps) {
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWishlist()
      .then((items) => {
        const item = items.find((i) => i.product_id === productId);
        if (item?.target_price != null) {
          setSaved(item.target_price);
          setTarget(String(item.target_price));
        }
      })
      .catch(() => undefined);
  }, [productId]);

  const save = async () => {
    const value = target.trim() === "" ? null : Number(target);
    setSaving(true);
    try {
      await setWishlistTarget(productId, value);
      setSaved(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-primary500/40 bg-primary500/5 p-3">
      <p className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-gray-700">
        <BellRing className="size-4 text-primary500" />
        Báo tôi khi giá giảm
      </p>
      <p className="mt-0.5 font-sans text-[12px] text-gray-500">
        Giá hiện tại {formatPrice(currentPrice)}. Để trống = báo mỗi khi giá giảm.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          min={0}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Giá mong muốn (đ)"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-sans text-[13px] outline-none focus:border-primary500"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="shrink-0 rounded-lg bg-primary500 px-3 py-1.5 font-sans text-[13px] font-semibold text-white disabled:opacity-60"
        >
          Lưu
        </button>
      </div>
      {saved !== null && (
        <p className="mt-1.5 flex items-center gap-1 font-sans text-[12px] text-emerald-600">
          <Check className="size-3.5" /> Sẽ báo qua email khi giá còn {formatPrice(saved)} trở xuống
        </p>
      )}
    </div>
  );
}
