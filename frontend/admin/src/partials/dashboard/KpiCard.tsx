import LineChart from "../../charts/LineChart01";
import LineChartCount from "../../charts/LineChartCount";
import { chartAreaGradient } from "../../charts/ChartjsConfig";
import { adjustColorOpacity, getCssVariable } from "../../utils/Utils";
import { isoDateToChartLabel } from "../../helpers/chartDate";

interface KpiCardProps {
  title: string;
  subtitle: string;
  value: string;
  changePercent: number;
  labels: string[];
  series: number[];
  unit?: "money" | "count";
}

export default function KpiCard({ title, subtitle, value, changePercent, labels, series, unit = "money" }: KpiCardProps) {
  const chartLabels = labels.map(isoDateToChartLabel);
  const Chart = unit === "count" ? LineChartCount : LineChart;
  const isPositive = changePercent >= 0;

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data: series,
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
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <div className="px-5 pt-5">
        <header className="mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">{subtitle}</div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{value}</div>
          <div
            className={`text-sm font-medium px-1.5 rounded-full ${
              isPositive ? "text-green-700 bg-green-500/20" : "text-red-700 bg-red-500/20"
            }`}
          >
            {isPositive ? "+" : ""}
            {changePercent}%
          </div>
        </div>
      </div>
      <div className="grow max-sm:max-h-[128px] xl:max-h-[128px]">
        <Chart data={chartData} width={389} height={128} />
      </div>
    </div>
  );
}
