import { apiGet, apiPost } from "../libs/api";
import type {
  ApiListResponse,
  Category,
  PaginationMeta,
  Product,
  ProductDetail,
  ProductSort,
  ProductVariant,
  Store,
  StoreListItem,
  StoreSort,
  UseCase,
} from "../types/product";

interface RawProduct extends Omit<Product, "price" | "final_price"> {
  price: string | number;
  final_price: string | number;
}

function normalizeProduct(raw: RawProduct): Product {
  return {
    ...raw,
    price: Number(raw.price),
    final_price: Number(raw.final_price),
    discount_percent: Number(raw.discount_percent) || 0,
    images: raw.images ?? [],
  };
}

export async function getCategoriesWithBrands(): Promise<Category[]> {
  const res = await apiGet<ApiListResponse<Category>>("/categories", {
    per_page: 100,
    with_brands: 1,
  });
  return res.data;
}

export async function getProductsByCategory(
  categoryId: number,
  perPage = 12,
  useCase?: string | null,
  provinceId?: number | null,
): Promise<Product[]> {
  const res = await apiGet<ApiListResponse<RawProduct>>("/products", {
    category_id: categoryId,
    useCase: useCase || undefined,
    province_id: provinceId || undefined,
    per_page: perPage,
  });
  return res.data.map(normalizeProduct);
}

export async function getUseCasesByCategory(
  categoryId: number,
): Promise<UseCase[]> {
  const res = await apiGet<{ success: boolean; data: UseCase[] }>(
    "/use-cases",
    { categoryId },
  );
  return res.data ?? [];
}

export async function getCategories(): Promise<Category[]> {
  const res = await apiGet<ApiListResponse<Category>>("/categories", {
    per_page: 100,
    parent_id: "null",
  });
  return res.data.filter((category) => category.status === 1);
}

export async function getCategoriesWithChildren(): Promise<Category[]> {
  const res = await apiGet<ApiListResponse<Category>>("/categories", {
    per_page: 100,
    parent_id: "null",
    with_children: 1,
  });
  return res.data.filter((category) => category.status === 1);
}

export async function getSubcategories(parentId: number): Promise<Category[]> {
  const res = await apiGet<ApiListResponse<Category>>("/categories", {
    per_page: 100,
    parent_id: parentId,
  });
  return res.data.filter((category) => category.status === 1);
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | undefined> {
  const categories = await getCategoriesWithBrands();
  return categories.find((category) => category.slug === slug);
}

interface RawVariant {
  sku: string;
  attributes?: Record<string, string>;
  price: string | number;
  stock: string | number;
}

interface RawProductDetail extends RawProduct {
  specifications?: { name: string; value: string }[];
  variants?: RawVariant[];
}

function normalizeVariant(raw: RawVariant): ProductVariant {
  return {
    sku: raw.sku,
    attributes: raw.attributes ?? {},
    price: Number(raw.price) || 0,
    stock: Number(raw.stock) || 0,
  };
}

export async function getProductDetail(
  slugOrId: string | number,
): Promise<ProductDetail> {
  const res = await apiGet<{ success: boolean; data: RawProductDetail }>(
    `/products/${slugOrId}`,
  );
  const raw = res.data;

  return {
    ...normalizeProduct(raw),
    specifications: raw.specifications ?? [],
    variants: (raw.variants ?? []).map(normalizeVariant),
  };
}

export async function getSimilarProducts(
  categoryId: number,
  excludeId: number,
  limit = 5,
): Promise<Product[]> {
  const pool = await getProductsByCategory(categoryId, 20);
  const candidates = pool.filter((product) => product.id !== excludeId);

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, limit);
}

interface GetProductsParams {
  categoryId?: number;
  brandId?: number | null;
  storeId?: number | null;
  useCase?: string | null;
  provinceId?: number | null;
  search?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  isFeatured?: boolean;
  isFlashSale?: boolean;
}

export async function getProducts({
  categoryId,
  brandId,
  storeId,
  useCase,
  provinceId,
  search,
  sort,
  page = 1,
  perPage = 20,
  isFeatured,
  isFlashSale,
}: GetProductsParams): Promise<{ products: Product[]; meta: PaginationMeta }> {
  const res = await apiGet<ApiListResponse<RawProduct>>("/products", {
    category_id: categoryId,
    brand_id: brandId ?? undefined,
    store_id: storeId ?? undefined,
    useCase: useCase || undefined,
    province_id: provinceId || undefined,
    search: search || undefined,
    is_featured: isFeatured ? 1 : undefined,
    is_flash_sale: isFlashSale ? 1 : undefined,
    sort,
    page,
    per_page: perPage,
  });
  return { products: res.data.map(normalizeProduct), meta: res.meta };
}

export async function getFlashSaleEndsAt(): Promise<string | null> {
  const res = await apiGet<{ success: boolean; data: { ends_at: string | null } }>(
    "/settings/flash-sale",
  );
  return res.data.ends_at;
}

export async function getStoreBySlug(slug: string): Promise<Store> {
  const res = await apiGet<{ success: boolean; data: Store }>(
    `/stores/${slug}`,
  );
  return res.data;
}

export async function getStores({
  search,
  sort,
  provinceId,
  page = 1,
  perPage = 12,
}: {
  search?: string;
  sort?: StoreSort;
  provinceId?: number | null;
  page?: number;
  perPage?: number;
} = {}): Promise<{ stores: StoreListItem[]; meta: PaginationMeta }> {
  const res = await apiGet<ApiListResponse<StoreListItem>>("/stores", {
    search: search || undefined,
    province_id: provinceId || undefined,
    sort,
    page,
    per_page: perPage,
  });
  return { stores: res.data, meta: res.meta };
}

export async function toggleFollowStore(
  slug: string,
): Promise<{ following: boolean; followers_count: number }> {
  const res = await apiPost<{
    success: boolean;
    data: { following: boolean; followers_count: number };
  }>(`/stores/${slug}/follow`);
  return res.data;
}
