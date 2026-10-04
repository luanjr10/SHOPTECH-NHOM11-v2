import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { Boxes, CalendarClock, Images, Tag, X } from "lucide-react";
import { getProductById } from "../../services/products.services";
import { ProductItem } from "../../types/products.types";
import { CategoryItem } from "../../types/categories.types";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { formatDate } from "../../helpers/formatDate";
import ImageGallery from "../common/ImageGallery";

interface ProductDetailModalProps {
  open: boolean;
  productId?: number;
  onClose: () => void;
  categories: CategoryItem[];
}

export default function ProductDetailModal({
  open,
  productId,
  onClose,
  categories,
}: ProductDetailModalProps) {
  const [product, setProduct] = useState<ProductItem | null>(null);

  useEffect(() => {
    if (!open || !productId) {
      setProduct(null);
      return;
    }

    getProductById(productId).then((response) => {
      setProduct(response?.data ?? null);
    });
  }, [open, productId]);

  if (!product) return null;

  const images = product.images?.length
    ? product.images
    : product.thumbnail
      ? [product.thumbnail]
      : [];

  const categoryName = categories.find(
    (item) => String(item.id) === String(product.category_id),
  )?.name;

  const inStock = product.stock > 0;
  const isActive = product.status === 1;
  const specifications = product.specifications ?? [];

  return (
    <Modal show={open} size="4xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-semibold text-white">
                {product.name}
              </h3>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {product.code}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 cursor-pointer"
            >
              <X className="h-5 w-5 transition duration-150 ease-in-out hover:rotate-45" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
            <div className="md:col-span-2">
              <ImageGallery images={images} alt={product.name} />
            </div>

            <div className="space-y-5 md:col-span-3">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-indigo-400">
                  {formatMoneyVietNam(product.final_price ?? product.price)}
                </span>
                {(product.discount_percent ?? 0) > 0 && (
                  <>
                    <span className="text-base text-slate-500 line-through">
                      {formatMoneyVietNam(product.price)}
                    </span>
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
                      -{product.discount_percent}%
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
                    isActive
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-500/20 bg-slate-500/10 text-slate-400"
                  }`}
                >
                  {isActive ? "Đang hiển thị" : "Đang tạm ẩn"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
                    inStock
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {inStock ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
                </span>
                {categoryName && (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
                    <Tag className="h-3 w-3" />
                    {categoryName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-y-3 rounded-xl border border-slate-800 bg-[#0b1120]/60 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Boxes className="h-4 w-4" /> Kho hàng
                </div>
                <div className="text-right text-sm font-medium text-slate-200">
                  {product.stock}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Images className="h-4 w-4" /> Số lượng ảnh
                </div>
                <div className="text-right text-sm font-medium text-slate-200">
                  {images.length}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CalendarClock className="h-4 w-4" /> Cập nhật
                </div>
                <div className="text-right text-sm font-medium text-slate-200">
                  {formatDate(product.updated_at || "")}
                </div>
              </div>

              {specifications.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-300">
                    Thông số kỹ thuật
                  </h4>
                  <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
                    {specifications.map((spec, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-4 py-2.5 text-sm odd:bg-[#0b1120]/40"
                      >
                        <span className="text-slate-400">{spec.name}</span>
                        <span className="font-medium text-slate-200">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
