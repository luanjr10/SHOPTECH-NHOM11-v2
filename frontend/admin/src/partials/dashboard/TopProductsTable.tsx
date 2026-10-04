import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { TopProductItem } from "../../types/dashboard.types";

interface Props {
  data: TopProductItem[];
}

export default function TopProductsTable({ data }: Props) {
  return (
    <div className="col-span-full xl:col-span-8 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Sản phẩm bán chạy</h2>
      </header>
      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="table-auto w-full dark:text-gray-300">
            <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-xs">
              <tr>
                <th className="p-2">
                  <div className="font-semibold text-left">Sản phẩm</div>
                </th>
                <th className="p-2">
                  <div className="font-semibold text-center">Đã bán</div>
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
                    Chưa có sản phẩm nào có đơn hoàn tất
                  </td>
                </tr>
              ) : (
                data.map((product) => (
                  <tr key={product.product_id}>
                    <td className="p-2">
                      <div className="text-gray-800 dark:text-gray-100 truncate max-w-xs">{product.name}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-center">{product.quantity_sold}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-right text-green-500">{formatMoneyVietNam(product.revenue)}</div>
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
