import { Link } from "react-router-dom";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { TopStoreItem } from "../../types/dashboard.types";

interface Props {
  data: TopStoreItem[];
}

export default function TopStoresTable({ data }: Props) {
  return (
    <div className="col-span-full xl:col-span-8 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Top gian hàng</h2>
      </header>
      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="table-auto w-full dark:text-gray-300">
            <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-xs">
              <tr>
                <th className="p-2">
                  <div className="font-semibold text-left">Gian hàng</div>
                </th>
                <th className="p-2">
                  <div className="font-semibold text-center">Số đơn</div>
                </th>
                <th className="p-2">
                  <div className="font-semibold text-right">Doanh thu</div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">
                    Chưa có gian hàng nào có đơn hoàn tất
                  </td>
                </tr>
              ) : (
                data.map((store) => (
                  <tr key={store.id}>
                    <td className="p-2">
                      <div className="flex items-center">
                        {store.logo ? (
                          <img
                            className="shrink-0 mr-2 sm:mr-3 size-9 rounded-full object-cover"
                            src={store.logo}
                            alt={store.name}
                          />
                        ) : (
                          <div className="shrink-0 mr-2 sm:mr-3 size-9 rounded-full bg-violet-500" />
                        )}
                        <Link to="/stores" className="text-gray-800 dark:text-gray-100 hover:text-violet-500">
                          {store.name}
                        </Link>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-center">{store.orders_count}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-right text-green-500">{formatMoneyVietNam(store.revenue)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
