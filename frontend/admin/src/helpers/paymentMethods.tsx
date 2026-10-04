import { PayoutMethod } from "../types/withdrawal.types";

export const PAYOUT_METHODS: { id: PayoutMethod; label: string; accountLabel: string; accountPlaceholder: string }[] = [
  {
    id: "cod",
    label: "Chuyển khoản ngân hàng",
    accountLabel: "Số tài khoản",
    accountPlaceholder: "0123456789",
  },
  {
    id: "momo",
    label: "Ví MoMo",
    accountLabel: "Số điện thoại MoMo",
    accountPlaceholder: "09xxxxxxxx",
  },
  {
    id: "vnpay",
    label: "VNPay",
    accountLabel: "Số tài khoản/thẻ",
    accountPlaceholder: "0123456789",
  },
  {
    id: "onepay",
    label: "OnePay",
    accountLabel: "Số tài khoản/thẻ",
    accountPlaceholder: "0123456789",
  },
  {
    id: "sepay",
    label: "SePay",
    accountLabel: "Số tài khoản ngân hàng",
    accountPlaceholder: "0123456789",
  },
];

export const PAYOUT_METHOD_LABEL: Record<PayoutMethod, string> = PAYOUT_METHODS.reduce(
  (acc, m) => ({ ...acc, [m.id]: m.label }),
  {} as Record<PayoutMethod, string>,
);
