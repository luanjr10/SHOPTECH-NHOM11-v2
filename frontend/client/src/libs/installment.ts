import { apiGet } from "./api";

export interface InstallmentOption {
  months: number;
  monthly_rate: number;
}

/** Điều kiện bán trả góp do từng gian hàng tự đặt. */
export interface StoreInstallmentOptions {
  store_id: number;
  store_name: string;
  enabled: boolean;
  min_order: number;
  options: InstallmentOption[];
}

export interface InstallmentQuote {
  months: number;
  monthlyRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayable: number;
}

const cache = new Map<number, Promise<StoreInstallmentOptions>>();

/** Điều kiện trả góp của gian hàng, cache theo gian hàng để thẻ sản phẩm không gọi lặp. */
export function fetchStoreInstallment(storeId: number): Promise<StoreInstallmentOptions> {
  let cached = cache.get(storeId);

  if (!cached) {
    cached = apiGet<{ data: StoreInstallmentOptions }>("/installments/options", { store_id: storeId })
      .then((res) => res.data)
      .catch((err) => {
        cache.delete(storeId);
        throw err;
      });
    cache.set(storeId, cached);
  }

  return cached;
}

/** Cùng công thức với InstallmentService::quote ở backend (lãi phẳng, kỳ cuối gánh phần dư). */
export function quoteInstallment(principal: number, option: InstallmentOption): InstallmentQuote {
  const base = Math.round(principal);
  const totalInterest = Math.round((base * option.monthly_rate * option.months) / 100);
  const principalPart = Math.floor(base / option.months);
  const interestPart = Math.round(totalInterest / option.months);

  return {
    months: option.months,
    monthlyRate: option.monthly_rate,
    monthlyPayment: principalPart + interestPart,
    totalInterest,
    totalPayable: base + totalInterest,
  };
}
