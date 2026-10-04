import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Breadcrumb } from "../components/category/Breadcrumb";
import { CategoryBanner } from "../components/category/CategoryBanner";
import { BrandGrid } from "../components/category/BrandGrid";
import { SortBar } from "../components/category/SortBar";
import { ProductGrid } from "../components/category/ProductGrid";
import { CategoryQnA } from "../components/category/CategoryQnA";
import { QuickLinks } from "../components/products/ProductSection/QuickLinks";
import { useLocationContext } from "../context/LocationContext";
import {
  getCategoryBySlug,
  getProducts,
  getUseCasesByCategory,
} from "../services/catalog";
import {
  type Category,
  type PaginationMeta,
  type Product,
  type ProductSort,
  type UseCase,
} from "../types/product";

const PER_PAGE = 20;

function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const useCaseSlug = searchParams.get("useCase");
  const { selectedProvince } = useLocationContext();

  const [category, setCategory] = useState<Category | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(true);

  const [useCases, setUseCases] = useState<UseCase[]>([]);

  const [sort, setSort] = useState<ProductSort>("discount_desc");
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let ignore = false;
    setLoadingCategory(true);

    setSelectedBrandId(null);

    getCategoryBySlug(slug)
      .then((found) => {
        if (!ignore) setCategory(found ?? null);
      })
      .catch((error) => console.error("Không tải được danh mục:", error))
      .finally(() => {
        if (!ignore) setLoadingCategory(false);
      });

    return () => {
      ignore = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!category) return;

    let ignore = false;

    getUseCasesByCategory(category.id)
      .then((data) => {
        if (!ignore) setUseCases(data);
      })
      .catch((error) => {
        console.error("Không tải được Quick Link:", error);
        if (!ignore) setUseCases([]);
      });

    return () => {
      ignore = true;
    };
  }, [category]);

  useEffect(() => {
    if (!category) return;

    let ignore = false;
    setLoadingProducts(true);

    getProducts({
      categoryId: category.id,
      brandId: selectedBrandId,
      useCase: useCaseSlug,
      provinceId: selectedProvince?.code,
      sort,
      page: 1,
      perPage: PER_PAGE,
    })
      .then(({ products: data, meta: metaData }) => {
        if (ignore) return;
        setProducts(data);
        setMeta(metaData);
        setPage(1);
      })
      .catch((error) => {
        console.error("Không tải được sản phẩm:", error);
        if (!ignore) setProducts([]);
      })
      .finally(() => {
        if (!ignore) setLoadingProducts(false);
      });

    return () => {
      ignore = true;
    };
  }, [category, sort, selectedBrandId, useCaseSlug, selectedProvince]);

  const handleLoadMore = () => {
    if (!category) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    getProducts({
      categoryId: category.id,
      brandId: selectedBrandId,
      useCase: useCaseSlug,
      provinceId: selectedProvince?.code,
      sort,
      page: nextPage,
      perPage: PER_PAGE,
    })
      .then(({ products: more, meta: metaData }) => {
        setProducts((prev) => [...prev, ...more]);
        setMeta(metaData);
        setPage(nextPage);
      })
      .catch((error) => console.error("Không tải thêm được sản phẩm:", error))
      .finally(() => setLoadingMore(false));
  };

  const handleSelectUseCase = (nextSlug: string) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (useCaseSlug === nextSlug) {
          params.delete("useCase");
        } else {
          params.set("useCase", nextSlug);
        }
        return params;
      },
      { replace: true },
    );
  };

  const hasMore = meta ? page < meta.last_page : false;
  const categoryName = category?.name ?? "Danh mục";

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-4 px-3 py-3 sm:gap-6 sm:px-4 sm:py-4">
      <Breadcrumb items={[{ label: categoryName }]} />

      <CategoryBanner />

      <BrandGrid
        title={categoryName}
        brands={category?.brands ?? []}
        loading={loadingCategory}
        selectedBrandId={selectedBrandId}
        onSelect={setSelectedBrandId}
      />

      <QuickLinks
        links={useCases}
        activeSlug={useCaseSlug}
        onSelect={handleSelectUseCase}
      />

      <SortBar value={sort} onChange={setSort} />

      <ProductGrid
        products={products}
        loading={loadingProducts}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />

      {category && <CategoryQnA categoryId={category.id} />}
    </div>
  );
}

export default CategoryPage;
