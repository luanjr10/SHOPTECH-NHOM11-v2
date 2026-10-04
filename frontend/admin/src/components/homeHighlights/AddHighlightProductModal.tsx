import { useEffect, useState } from "react";
import { Button, Checkbox, Modal, ModalBody, ModalHeader, TextInput } from "flowbite-react";
import { X } from "lucide-react";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { getAllProducts } from "../../services/products.services";
import { updateProductHighlight } from "../../services/homeHighlights.services";
import { formatMoneyVietNam } from "../../helpers/formatMoney";

interface ProductOption {
  id: number;
  code: string;
  name: string;
  thumbnail: string | null;
  price: number | string;
  is_featured?: boolean;
  is_flash_sale?: boolean;
}

interface AddHighlightProductModalProps {
  open: boolean;
  highlight: "featured" | "flash_sale";
  onClose: () => void;
  onAdded: () => void;
}

export default function AddHighlightProductModal({
  open,
  highlight,
  onClose,
  onAdded,
}: AddHighlightProductModalProps) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const flagKey = highlight === "featured" ? "is_featured" : "is_flash_sale";
  const highlightLabel = highlight === "featured" ? "Hot trend" : "Flash sale";

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelected(new Set());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = setTimeout(() => {
      getAllProducts({ search, sort: "newest" })
        .then((res) => setProducts(res?.data ?? []))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, search]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0) {
      notifyError("Chọn ít nhất một sản phẩm");
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          updateProductHighlight(id, { [flagKey]: true }),
        ),
      );
      notifySuccess(`Đã thêm ${selected.size} sản phẩm vào ${highlightLabel}`);
      onAdded();
      onClose();
    } catch {
      notifyError("Có lỗi khi thêm sản phẩm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={open} size="2xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Thêm sản phẩm vào {highlightLabel}
            </h3>
            <button
              type="button"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400"
              onClick={onClose}
            >
              <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
            </button>
          </div>

          <TextInput
            placeholder="Tìm sản phẩm theo tên hoặc mã..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {loading && (
              <p className="py-6 text-center text-sm text-slate-400">
                Đang tải...
              </p>
            )}
            {!loading && products.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Không tìm thấy sản phẩm phù hợp
              </p>
            )}
            {!loading &&
              products.map((product) => {
                const already = Boolean(product[flagKey]);
                const checked = selected.has(product.id) || already;
                return (
                  <label
                    key={product.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                      already
                        ? "cursor-not-allowed border-emerald-500/30 bg-emerald-500/5"
                        : "cursor-pointer border-slate-800 bg-[#0b1120]/60 hover:border-primary500/40"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={already}
                      onChange={() => toggle(product.id)}
                    />
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        alt={product.name}
                        className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-800" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-200">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {product.code} · {formatMoneyVietNam(Number(product.price))}
                      </p>
                    </div>
                    {already && (
                      <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400">
                        Đã thêm
                      </span>
                    )}
                  </label>
                );
              })}
          </div>

          <div className="flex flex-row items-center justify-end gap-2 pt-2">
            <Button
              type="submit"
              disabled={submitting || selected.size === 0}
              className="cursor-pointer"
            >
              {submitting ? "Đang thêm..." : `Thêm ${selected.size || ""} sản phẩm`}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="cursor-pointer"
            >
              Hủy
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}
