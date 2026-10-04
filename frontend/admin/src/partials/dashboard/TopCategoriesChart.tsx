import DoughnutChart from "../../charts/DoughnutChart";
import { getCssVariable } from "../../utils/Utils";
import { TopCategoryItem } from "../../types/dashboard.types";

interface Props {
  data: TopCategoryItem[];
}

const PALETTE = [
  ["--color-violet-500", "--color-violet-600"],
  ["--color-sky-500", "--color-sky-600"],
  ["--color-violet-800", "--color-violet-900"],
  ["--color-emerald-500", "--color-emerald-600"],
  ["--color-amber-500", "--color-amber-600"],
  ["--color-rose-500", "--color-rose-600"],
];

export default function TopCategoriesChart({ data }: Props) {
  const hasData = data.some((item) => item.revenue > 0);

  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        label: "Doanh thu theo danh mục",
        data: data.map((item) => item.revenue),
        backgroundColor: data.map((_, i) => getCssVariable(PALETTE[i % PALETTE.length][0])),
        hoverBackgroundColor: data.map((_, i) => getCssVariable(PALETTE[i % PALETTE.length][1])),
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Doanh thu theo danh mục</h2>
      </header>
      {hasData ? (
        <DoughnutChart data={chartData} width={389} height={260} />
      ) : (
        <div className="flex grow items-center justify-center py-10 text-sm text-gray-400 dark:text-gray-500">
          Chưa có đơn hàng hoàn tất
        </div>
      )}
    </div>
  );
}
