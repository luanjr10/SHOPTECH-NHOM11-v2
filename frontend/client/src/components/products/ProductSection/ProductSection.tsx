import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CategoryTabs } from "./CategoryTabs";
import { QuickLinks } from "./QuickLinks";
import { BrandChips } from "./BrandChips";
import { ProductRows } from "./ProductRows";
import { useLocationContext } from "../../../context/LocationContext";
import {
  getCategoriesWithBrands,
  getProductsByCategory,
  getUseCasesByCategory,
} from "../../../services/catalog";
import {
  type Category,
  type MainCategoryRef,
  type Product,
  type UseCase,
} from "../../../types/product";

interface ProductSectionProps {
  categories: MainCategoryRef[];
  banners: [string, string];
}

export function ProductSection({ categories, banners }: ProductSectionProps) {
  const navigate = useNavigate();
  const { selectedProvince } = useLocationContext();

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const [useCases, setUseCases] = useState<UseCase[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    getCategoriesWithBrands()
      .then((data) => {
        if (!ignore) setAllCategories(data);
      })
      .catch((error) => console.error("Không tải được danh mục:", error))
      .finally(() => {
        if (!ignore) setCategoriesLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const resolvedCategories = useMemo(
    () =>
      categories.map((ref) =>
        allCategories.find((category) => category.code === ref.code),
      ),
    [categories, allCategories],
  );

  const activeCategory = resolvedCategories[activeIndex];

  useEffect(() => {
    if (!activeCategory) return;

    let ignore = false;

    getUseCasesByCategory(activeCategory.id)
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
  }, [activeCategory]);

  useEffect(() => {
    if (!activeCategory) return;

    let ignore = false;
    setProductsLoading(true);

    getProductsByCategory(activeCategory.id, 12, null, selectedProvince?.code)
      .then((data) => {
        if (!ignore) setProducts(data);
      })
      .catch((error) => {
        console.error("Không tải được sản phẩm:", error);
        if (!ignore) setProducts([]);
      })
      .finally(() => {
        if (!ignore) setProductsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeCategory, selectedProvince]);

  const handleTabChange = (index: number) => {
    setActiveIndex(index);
    setSelectedBrandId(null);
  };

  const handleSelectUseCase = (slug: string) => {
    if (!activeCategory) return;
    navigate(`/danh-muc/${activeCategory.slug}?useCase=${slug}`);
  };

  const tabs = categories.map((ref) => ({ label: ref.label }));

  return (
    <div className="flex flex-row gap-2">
      <div className="hidden w-50 shrink-0 flex-col gap-2 lg:flex">
        <img
          className="w-full rounded-lg object-cover"
          src={banners[0]}
          alt="Banner 1"
        />
        <img
          className="w-full rounded-lg object-cover"
          src={banners[1]}
          alt="Banner 2"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-stretch rounded-xl border border-gray-100 bg-white/60 p-2 sm:p-3 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <CategoryTabs
          tabs={tabs}
          activeIndex={activeIndex}
          onChange={handleTabChange}
        />

        <QuickLinks links={useCases} onSelect={handleSelectUseCase} />

        <BrandChips
          brands={activeCategory?.brands ?? []}
          loading={categoriesLoading}
          selectedBrandId={selectedBrandId}
          onSelect={setSelectedBrandId}
        />

        <ProductRows
          products={products}
          loading={categoriesLoading || productsLoading}
        />
      </div>
    </div>
  );
}
