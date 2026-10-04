import BarChart from "../../charts/BarChart01";
import { getCssVariable } from "../../utils/Utils";
import { monthLabelToChartLabel } from "../../helpers/chartDate";
import { RevenueByPaymentMethod } from "../../types/dashboard.types";

interface Props {
  data: RevenueByPaymentMethod;
}

export default function PaymentMethodChart({ data }: Props) {
  const chartData = {
    labels: data.labels.map(monthLabelToChartLabel),
    datasets: [
      {
        label: "COD",
        data: data.cod,
        backgroundColor: getCssVariable("--color-sky-500"),
        hoverBackgroundColor: getCssVariable("--color-sky-600"),
        barPercentage: 0.7,
        categoryPercentage: 0.7,
        borderRadius: 4,
      },
      {
        label: "Thanh toán online",
        data: data.online,
        backgroundColor: getCssVariable("--color-violet-500"),
        hoverBackgroundColor: getCssVariable("--color-violet-600"),
        barPercentage: 0.7,
        categoryPercentage: 0.7,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Doanh thu: COD vs Thanh toán online</h2>
      </header>
      <BarChart data={chartData} width={595} height={248} />
    </div>
  );
}
