import { PackageCheck, RefreshCw, Cpu, BadgePercent } from "lucide-react";

const COMMITMENTS = [
  {
    icon: PackageCheck,
    text: "Mới, đầy đủ phụ kiện từ nhà sản xuất",
  },
  {
    icon: RefreshCw,
    text: "1 đổi 1 trong 30 ngày nếu có lỗi phần cứng từ nhà sản xuất",
  },
  {
    icon: Cpu,
    text: "Máy, sách hướng dẫn, cây lấy sim, cáp Type C",
  },
  {
    icon: BadgePercent,
    text: "Giá sản phẩm đã bao gồm thuế VAT",
  },
] as const;

export function ProductCommitments() {
  return (
    <div>
      <h2 className="mb-3 font-sans text-[16px] font-bold text-gray-900">
        Cam kết sản phẩm
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COMMITMENTS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary500/10 text-primary500">
              <Icon className="size-5" strokeWidth={1.8} />
            </span>
            <p className="font-sans text-[13px] text-gray-600">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
