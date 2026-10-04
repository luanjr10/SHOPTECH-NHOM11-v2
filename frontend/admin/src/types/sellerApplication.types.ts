export type SellerApplicationStatus = "pending" | "approved" | "rejected";

export interface SellerApplicationUser {
  id: number;
  name: string;
  username: string;
  email: string;
}

export interface SellerApplication {
  id: number;
  user_id: number;
  shop_name: string;
  phone: string | null;
  address: string | null;
  category_ids?: number[] | null;
  category_names?: string[];
  status: SellerApplicationStatus;
  reject_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  user?: SellerApplicationUser;
  reviewer?: { id: number; name: string } | null;
}
