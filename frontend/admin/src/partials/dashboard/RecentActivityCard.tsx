import { CheckCircle2, Heart, Star, UserPlus } from "lucide-react";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { RecentActivityItem } from "../../types/dashboard.types";

interface Props {
  data: RecentActivityItem[];
}

const ICONS: Record<RecentActivityItem["type"], { icon: typeof CheckCircle2; bg: string }> = {
  order_completed: { icon: CheckCircle2, bg: "bg-emerald-500" },
  seller_joined: { icon: UserPlus, bg: "bg-sky-500" },
  new_follower: { icon: Heart, bg: "bg-rose-500" },
  review: { icon: Star, bg: "bg-amber-500" },
};

export default function RecentActivityCard({ data }: Props) {
  return (
    <div className="col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Hoạt động gần đây</h2>
      </header>
      <div className="p-3">
        {data.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">Chưa có hoạt động nào</p>
        ) : (
          <ul className="my-1">
            {data.map((item, index) => {
              const { icon: Icon, bg } = ICONS[item.type];
              return (
                <li key={index} className="flex px-2">
                  <div className={`w-9 h-9 rounded-full shrink-0 ${bg} my-2 mr-3 flex items-center justify-center`}>
                    <Icon className="size-4 text-white" />
                  </div>
                  <div
                    className={`grow flex items-center text-sm py-2 ${
                      index < data.length - 1 ? "border-b border-gray-100 dark:border-gray-700/60" : ""
                    }`}
                  >
                    <div className="grow flex justify-between gap-2">
                      <div className="self-center text-gray-700 dark:text-gray-200">{item.title}</div>
                      <div className="shrink-0 self-end ml-2 text-right">
                        {item.amount !== null && (
                          <div className="font-medium text-emerald-600">+{formatMoneyVietNam(item.amount)}</div>
                        )}
                        <div className="text-xs text-gray-400">{formatDate(item.created_at)}</div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
