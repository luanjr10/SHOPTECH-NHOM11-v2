import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, PackageOpen } from "lucide-react";
import { Breadcrumb } from "../components/category/Breadcrumb";
import { ProductGallery } from "../components/product-detail/ProductGallery";
import { PurchasePanel } from "../components/product-detail/PurchasePanel";
import { ProductCommitments } from "../components/product-detail/ProductCommitments";
import { ProductSpecifications } from "../components/product-detail/ProductSpecifications";
import { ProductReviews } from "../components/product-detail/ProductReviews";
import { ProductQA } from "../components/product-detail/ProductQA";
import { SimilarProducts } from "../components/product-detail/SimilarProducts";
import { StoreInfoCard } from "../components/store/StoreInfoCard";
import { getProductDetail } from "../services/catalog";
import { type ProductDetail } from "../types/product";

function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let ignore = false;
    setLoading(true);
    setNotFound(false);
    window.scrollTo({ top: 0 });

    getProductDetail(slug)
      .then((data) => {
        if (!ignore) setProduct(data);
      })
      .catch((error) => {
        console.error("Không tải được sản phẩm:", error);
        if (!ignore) {
          setProduct(null);
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[1220px] items-center justify-center px-4">
        <Loader2 className="size-8 animate-spin text-primary500" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[1220px] flex-col items-center justify-center gap-4 px-4 text-gray-400">
        <PackageOpen size={48} strokeWidth={1.4} />
        <p className="font-sans text-[15px]">Không tìm thấy sản phẩm</p>
        <Link
          to="/"
          className="rounded-full border border-primary500 px-6 py-2 font-sans text-[14px] font-semibold text-primary500 transition-colors hover:bg-primary500 hover:text-white"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6 px-3 py-3 sm:px-4 sm:py-4">
      <Breadcrumb items={[{ label: product.name }]} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <ProductGallery images={product.images} name={product.name} />
        </div>
        <div className="flex flex-col gap-4">
          <PurchasePanel product={product} />
          {product.store && <StoreInfoCard store={product.store} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductCommitments />
        <ProductSpecifications specifications={product.specifications} />
      </div>

      <ProductReviews productId={product.id} productName={product.name} />
      <ProductQA productId={product.id} />

      <SimilarProducts
        categoryId={product.category_id}
        excludeId={product.id}
        limit={5}
      />
    </div>
  );
}

export default ProductDetailPage;
