import { apiGet, apiPost, apiUpload } from "../libs/api";
import type {
  CategoryComment,
  ProductComment,
  ProductReview,
  ProductReviewsResponse,
} from "../types/review";

export async function getProductReviews(
  productId: number | string,
  params: { rating?: number; verified?: boolean; page?: number } = {},
): Promise<ProductReviewsResponse["data"]> {
  const res = await apiGet<ProductReviewsResponse>(`/products/${productId}/reviews`, {
    rating: params.rating,
    verified: params.verified ? 1 : undefined,
    page: params.page,
  });
  return res.data;
}

export async function submitProductReview(
  productId: number | string,
  payload: { rating: number; comment?: string; images?: File[] },
): Promise<ProductReview> {
  const form = new FormData();
  form.append("rating", String(payload.rating));
  if (payload.comment) form.append("comment", payload.comment);
  (payload.images ?? []).forEach((file) => form.append("images[]", file));

  const res = await apiUpload<{ success: boolean; message: string; data: ProductReview }>(
    `/products/${productId}/reviews`,
    form,
  );
  return res.data;
}

export async function getProductComments(productId: number | string): Promise<ProductComment[]> {
  const res = await apiGet<{ success: boolean; data: ProductComment[] }>(`/products/${productId}/comments`);
  return res.data;
}

export async function submitProductComment(
  productId: number | string,
  payload: { body: string; parent_id?: number },
): Promise<ProductComment> {
  const res = await apiPost<{ success: boolean; message: string; data: ProductComment }>(
    `/products/${productId}/comments`,
    payload,
  );
  return res.data;
}

export async function getCategoryComments(categoryId: number | string): Promise<CategoryComment[]> {
  const res = await apiGet<{ success: boolean; data: CategoryComment[] }>(
    `/categories/${categoryId}/comments`,
  );
  return res.data;
}

export async function submitCategoryComment(
  categoryId: number | string,
  payload: { body: string; parent_id?: number },
): Promise<CategoryComment> {
  const res = await apiPost<{ success: boolean; message: string; data: CategoryComment }>(
    `/categories/${categoryId}/comments`,
    payload,
  );
  return res.data;
}
