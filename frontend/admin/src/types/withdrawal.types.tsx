export type PayoutMethod = "cod" | "momo" | "vnpay" | "onepay" | "sepay";

export interface WithdrawalItem {
  id: number;
  amount: number | string;
  method: PayoutMethod;
  status: "pending" | "approved" | "rejected";
  bank_account: string;
  bank_name: string;
  note?: string | null;
  payout_reference?: string | null;
  paid_at?: string | null;
  created_at: string;
}
