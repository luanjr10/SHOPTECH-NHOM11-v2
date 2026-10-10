import { apiAuthGet, apiPost } from "../libs/api";

export interface InstallmentPayment {
  id: number;
  number: number;
  amount: string;
  principal_part: string;
  interest_part: string;
  due_date: string;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  is_overdue: boolean;
}

export type InstallmentPlanStatus = "pending_approval" | "active" | "completed" | "rejected" | "cancelled";

export interface InstallmentPlan {
  id: number;
  order_id: number;
  store: { id: number; name: string; slug: string } | null;
  status: InstallmentPlanStatus;
  decision_note: string | null;
  decided_at: string | null;
  principal: number;
  months: number;
  monthly_rate: number;
  total_interest: number;
  total_payable: number;
  paid_amount: number;
  remaining_amount: number;
  product_names: string[];
  created_at: string;
  payments: InstallmentPayment[];
}

export interface InstallmentSummary {
  has_overdue: boolean;
  outstanding: number;
}

export const getInstallmentSummary = async (): Promise<InstallmentSummary> =>
  (await apiAuthGet<{ data: InstallmentSummary }>("/installments/summary")).data;

export const getInstallmentPlans = async (): Promise<{
  plans: InstallmentPlan[];
  summary: InstallmentSummary;
}> =>
  (
    await apiAuthGet<{ data: { plans: InstallmentPlan[]; summary: InstallmentSummary } }>(
      "/installments",
    )
  ).data;

export const payInstallment = async (paymentId: number): Promise<string> =>
  (
    await apiPost<{ data: { pay_url: string } }>(`/installments/payments/${paymentId}/pay`)
  ).data.pay_url;
