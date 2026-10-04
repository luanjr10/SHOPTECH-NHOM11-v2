import { type ProductSpecItem } from "../../types/product";

interface ProductSpecificationsProps {
  specifications: ProductSpecItem[];
}

export function ProductSpecifications({
  specifications,
}: ProductSpecificationsProps) {
  if (specifications.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 font-sans text-[16px] font-bold text-gray-900">
        Thông số kỹ thuật
      </h2>
      <div className="overflow-hidden rounded-2xl border border-gray-100">
        <table className="w-full border-collapse text-left font-sans text-[14px]">
          <tbody>
            {specifications.map((spec, index) => (
              <tr
                key={`${spec.name}-${index}`}
                className={index % 2 === 0 ? "bg-gray-50/70" : "bg-white"}
              >
                <th className="w-2/5 border-b border-gray-100 px-4 py-3 font-medium text-gray-500 align-top">
                  {spec.name}
                </th>
                <td className="border-b border-gray-100 px-4 py-3 text-gray-800">
                  {spec.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
