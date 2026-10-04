import { useEffect, useState } from "react";
import { ProductCard } from "../products/ProductCard/ProductCard";
import { ProductCardSkeleton } from "../products/ProductCard/ProductCardSkeleton";
import { getSimilarProducts } from "../../services/catalog";
import { type Product } from "../../types/product";

interface SimilarProductsProps {
  categoryId: number;
  excludeId: number;
  limit?: number;
}

export function SimilarProducts({
  categoryId,
  excludeId,
  limit = 5,
}: SimilarProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    getSimilarProducts(categoryId, excludeId, limit)
      .then((data) => {
        if (!ignore) setProducts(data);
      })
      .catch((error) => {
        console.error("Không tải được sản phẩm tương tự:", error);
        if (!ignore) setProducts([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [categoryId, excludeId, limit]);

  if (!loading && products.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 font-sans text-[18px] font-bold text-gray-900">
        Có thể bạn cũng thích
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: limit }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          : products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
    </div>
  );
}
