export interface ReviewItem {
  id: number;
  product_id: number;
  rating: number;
  comment: string | null;
  images: string[] | null;
  is_verified_purchase: boolean;
  created_at: string;
  product?: { id: number; name: string; store_id?: number; store?: { id: number; name: string } };
  user?: { id: number; name: string; email: string };
}

export interface ReviewStats {
  average: number;
  count: number;
}

export interface StoreFollowerItem {
  id: number;
  created_at: string;
  user?: { id: number; name: string; email: string; phone: string | null; avatar_url?: string | null };
  store?: { id: number; name: string; slug: string };
}
