export interface Store {
  id: number;
  name: string;
  slug?: string;
  status: string;
}

export interface SellerProfile {
  id: number;
  user_id: number;
  stores?: Store[];
}

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  email_verified_at?: string | null;
  has_password?: boolean;
  role: "customer" | "seller" | "admin";
  seller_profile?: SellerProfile | null;
  sellerProfile?: SellerProfile | null;
}

export interface Address {
  id: number;
  user_id: number;
  recipient_name: string;
  phone: string;
  province_id_ghn: number;
  province_name_ghn: string;
  district_id: number;
  district_name: string;
  ward_code_ghn: string;
  ward_name_ghn: string;
  address_line: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AddressPayload {
  recipient_name: string;
  phone: string;
  province_id: number | null;
  district_id: number | null;
  ward_code: string | null;
  address_line: string;
  is_default?: boolean;
}

export interface SellerApplication {
  id: number;
  user_id: number;
  shop_name: string;
  phone: string | null;
  address: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}
