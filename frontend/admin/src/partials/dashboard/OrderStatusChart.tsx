import BarChart from "../../charts/BarChartCount";
import { getCssVariable } from "../../utils/Utils";
import { monthLabelToChartLabel } from "../../helpers/chartDate";
import { OrderStatusByMonth } from "../../types/dashboard.types";

interface Props {
  data: OrderStatusByMonth;
}

export default function OrderStatusChart({ data }: Props) {
  const totalCompleted = data.completed.reduce((s, v) => s + v, 0);
  const totalCancelled = data.cancelled.reduce((s, v) => s + v, 0);
  const cancelRate = totalCompleted + totalCancelled > 0
    ? Math.round((totalCancelled / (totalCompleted + totalCancelled)) * 100)
    : 0;

  const chartData = {
    labels: data.labels.map(monthLabelToChartLabel),
    datasets: [
      {
        label: "Hoàn tất",
        data: data.completed,
        backgroundColor: getCssVariable("--color-emerald-500"),
        hoverBackgroundColor: getCssVariable("--color-emerald-600"),
        barPercentage: 0.7,
        categoryPercentage: 0.7,
        borderRadius: 4,
      },
      {
        label: "Huỷ",
        data: data.cancelled,
        backgroundColor: getCssVariable("--color-rose-500"),
        hoverBackgroundColor: getCssVariable("--color-rose-600"),
        barPercentage: 0.7,
        categoryPercentage: 0.7,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Đơn hoàn tất vs huỷ theo tháng</h2>
      </header>
      <div className="px-5 py-3">
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{totalCompleted}</div>
          <div className="text-sm font-medium text-rose-700 px-1.5 bg-rose-500/20 rounded-full">
            {cancelRate}% huỷ
          </div>
        </div>
      </div>
      <div className="grow">
        <BarChart data={chartData} width={595} height={200} />
      </div>
    </div>
  );
}
