export interface TierMeta {
  key: string;
  label: string;
  min_spent: number;
  color: string;
}

export interface NextTier {
  tier: string;
  label: string;
  remaining: number;
}

export interface LoyaltySummary {
  tier: string;
  tier_label: string;
  tier_color: string;
  total_spent: number;
  next_tier: NextTier | null;
  tiers: TierMeta[];
}

export interface MyVoucher {
  id: number;
  code: string;
  title: string | null;
  description: string | null;
  type: "percent" | "fixed" | "free_ship";
  is_free_ship: boolean;
  value: number;
  max_discount: number | null;
  min_order_amount: number;
  target_tier: string;
  target_tier_label: string;
  per_user_limit: number | null;
  used_count_by_me: number;
  remaining_for_me: number | null;
  expires_at: string | null;
  claimed: boolean;
}
