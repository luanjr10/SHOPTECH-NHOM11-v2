export interface DashboardKpi {
  current: number;
  previous: number;
  change_percent: number;
  labels: string[];
  series: number[];
}

export interface DashboardSeries {
  labels: string[];
  values: number[];
}

export interface RevenueByPaymentMethod {
  labels: string[];
  cod: number[];
  online: number[];
}

export interface OrderStatusByMonth {
  labels: string[];
  completed: number[];
  cancelled: number[];
}

export interface TopCategoryItem {
  name: string;
  revenue: number;
}

export interface TopStoreItem {
  id: number;
  name: string;
  logo: string | null;
  revenue: number;
  orders_count: number;
}

export interface TopCustomerItem {
  id: number;
  name: string;
  avatar_url: string | null;
  total_spent: number;
  orders_count: number;
}

export type RecentActivityType = "order_completed" | "seller_joined" | "new_follower" | "review";

export interface RecentActivityItem {
  type: RecentActivityType;
  title: string;
  amount: number | null;
  created_at: string;
}

export interface PlatformFunds {
  gmv_this_month: number;
  commission_this_month: number;
  gmv_last_month: number;
  commission_last_month: number;
}

export interface DashboardSummary {
  kpis: {
    revenue: DashboardKpi;
    orders: DashboardKpi;
    new_users: DashboardKpi;
  };
  revenue_by_payment_method: RevenueByPaymentMethod;
  daily_revenue: DashboardSeries;
  top_categories: TopCategoryItem[];
  top_stores: TopStoreItem[];
  top_customers: TopCustomerItem[];
  order_status_by_month: OrderStatusByMonth;
  recent_activity: RecentActivityItem[];
  platform_funds: PlatformFunds;
}

export interface TopProductItem {
  product_id: number;
  name: string;
  revenue: number;
  quantity_sold: number;
}

export interface SellerWalletSummary {
  balance: number;
  pending_balance: number;
  withdrawable_balance: number;
}

export interface SellerDashboardSummary {
  kpis: {
    revenue: DashboardKpi;
    orders: DashboardKpi;
    customers: DashboardKpi;
  };
  revenue_by_payment_method: RevenueByPaymentMethod;
  daily_revenue: DashboardSeries;
  top_categories: TopCategoryItem[];
  top_products: TopProductItem[];
  top_customers: TopCustomerItem[];
  order_status_by_month: OrderStatusByMonth;
  recent_activity: RecentActivityItem[];
  wallet: SellerWalletSummary;
}
