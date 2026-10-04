import LineChart from "../../charts/LineChart01";
import { chartAreaGradient } from "../../charts/ChartjsConfig";
import { adjustColorOpacity, getCssVariable } from "../../utils/Utils";
import { isoDateToChartLabel } from "../../helpers/chartDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { DashboardSeries } from "../../types/dashboard.types";

interface Props {
  data: DashboardSeries;
  title?: string;
  subtitle?: string;
}

export default function DailyRevenueChart({
  data,
  title = "Hoa hồng theo ngày (30 ngày)",
  subtitle = "Tổng hoa hồng ShopTech nhận trong 30 ngày",
}: Props) {
  const total = data.values.reduce((sum, v) => sum + v, 0);

  const chartData = {
    labels: data.labels.map(isoDateToChartLabel),
    datasets: [
      {
        data: data.values,
        fill: true,
        backgroundColor: function (context: any) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return "transparent";
          return chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(getCssVariable("--color-violet-500"), 0) },
            { stop: 1, color: adjustColorOpacity(getCssVariable("--color-violet-500"), 0.2) },
          ]);
        },
        borderColor: getCssVariable("--color-violet-500"),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointBackgroundColor: getCssVariable("--color-violet-500"),
        pointHoverBackgroundColor: getCssVariable("--color-violet-500"),
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        clip: 20,
        tension: 0.2,
      },
    ],
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      </header>
      <div className="px-5 py-3">
        <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{formatMoneyVietNam(total)}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</div>
      </div>
      <div className="grow">
        <LineChart data={chartData} width={595} height={200} />
      </div>
    </div>
  );
}
