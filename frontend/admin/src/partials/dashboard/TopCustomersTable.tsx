import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { TopCustomerItem } from "../../types/dashboard.types";

interface Props {
  data: TopCustomerItem[];
}

export default function TopCustomersTable({ data }: Props) {
  return (
    <div className="col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Top khách hàng</h2>
      </header>
      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="p-2 whitespace-nowrap">
                  <div className="font-semibold text-left">Khách hàng</div>
                </th>
                <th className="p-2 whitespace-nowrap">
                  <div className="font-semibold text-center">Số đơn</div>
                </th>
                <th className="p-2 whitespace-nowrap">
                  <div className="font-semibold text-right">Đã chi tiêu</div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">
                    Chưa có khách hàng nào có đơn hoàn tất
                  </td>
                </tr>
              ) : (
                data.map((customer) => (
                  <tr key={customer.id}>
                    <td className="p-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {customer.avatar_url ? (
                          <img
                            className="rounded-full shrink-0 mr-2 sm:mr-3 size-9 object-cover"
                            src={customer.avatar_url}
                            alt={customer.name}
                          />
                        ) : (
                          <div className="flex items-center justify-center rounded-full shrink-0 mr-2 sm:mr-3 size-9 bg-violet-500 text-white text-xs font-bold">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="font-medium text-gray-800 dark:text-gray-100">{customer.name}</div>
                      </div>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <div className="text-center">{customer.orders_count}</div>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <div className="text-right font-medium text-green-500">
                        {formatMoneyVietNam(customer.total_spent)}
                      </div>
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
