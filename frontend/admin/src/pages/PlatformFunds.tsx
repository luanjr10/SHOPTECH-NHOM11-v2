import { useEffect, useState } from "react";
import { Eye, Landmark, PackageCheck, Truck } from "lucide-react";
import {
  getPlatformFundsHeld,
  getPlatformFundsSettlements,
  getPlatformFundsSummary,
} from "../services/marketplace.services";
import { formatMoneyVietNam } from "../helpers/formatMoney";
import { formatDate } from "../helpers/formatDate";
import DataTable, { Column } from "../components/common/DataTable";
import PlatformFundOrderDetailModal from "../components/platformFunds/PlatformFundOrderDetailModal";
import { PlatformFundOrder, PlatformFundsSummary } from "../types/platformFunds.types";

const SELLER_ORDER_STATUS_LABEL: Record<string, string> = {
  shipping: "Đang giao",
  delivered: "Đã giao — chờ khách xác nhận",
  completed: "Hoàn tất",
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Landmark;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <span className={`flex size-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">{hint}</p>
    </div>
  );
}

function ProductCell({ order }: { order: PlatformFundOrder }) {
  return (
    <div>
      <div className="font-medium text-gray-800 dark:text-white">
        {order.items.map((i) => i.product_name).join(", ") || "—"}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {order.store?.name ?? "—"} · Người bán: {order.seller_profile?.user?.name ?? "—"}
      </div>
    </div>
  );
}

export default function PlatformFundsPage() {
  const [summary, setSummary] = useState<PlatformFundsSummary | null>(null);
  const [tab, setTab] = useState<"held" | "settlements">("held");

  const [held, setHeld] = useState<PlatformFundOrder[]>([]);
  const [heldPage, setHeldPage] = useState(1);
  const [heldMeta, setHeldMeta] = useState({ last_page: 1, total: 0 });

  const [settled, setSettled] = useState<PlatformFundOrder[]>([]);
  const [settledPage, setSettledPage] = useState(1);
  const [settledMeta, setSettledMeta] = useState({ last_page: 1, total: 0 });

  const [viewing, setViewing] = useState<PlatformFundOrder | null>(null);

  useEffect(() => {
    getPlatformFundsSummary().then(setSummary);
  }, []);

  useEffect(() => {
    getPlatformFundsHeld(heldPage).then((res) => {
      setHeld(res.data?.data ?? []);
      setHeldMeta({ last_page: res.data?.last_page ?? 1, total: res.data?.total ?? 0 });
    });
  }, [heldPage]);

  useEffect(() => {
    getPlatformFundsSettlements(settledPage).then((res) => {
      setSettled(res.data?.data ?? []);
      setSettledMeta({ last_page: res.data?.last_page ?? 1, total: res.data?.total ?? 0 });
    });
  }, [settledPage]);

  const heldColumns: Column<PlatformFundOrder>[] = [
    { header: "Đơn hàng", render: (o) => <span className="font-mono text-gray-500 dark:text-gray-400">#{o.order_id}</span> },
    { header: "Mặt hàng / Gian hàng", render: (o) => <ProductCell order={o} /> },
    { header: "Số tiền đang giữ", render: (o) => formatMoneyVietNam(o.held_amount ?? 0) },
    {
      header: "Trạng thái giao hàng",
      render: (o) => (
        <div className="flex flex-col gap-1">
          <span className="text-gray-700 dark:text-gray-300">{SELLER_ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
          <span className={`text-xs ${o.customer_received ? "text-teal-500" : "text-amber-500"}`}>
            {o.customer_received ? "Khách có thể đã nhận hàng" : "Khách chưa nhận hàng"}
          </span>
        </div>
      ),
    },
    { header: "Ngày đặt", render: (o) => formatDate(o.created_at) },
    {
      header: "",
      align: "center",
      render: (o) => (
        <button
          onClick={() => setViewing(o)}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
        >
          <Eye className="size-3.5" /> Chi tiết
        </button>
      ),
    },
  ];

  const settledColumns: Column<PlatformFundOrder>[] = [
    { header: "Đơn hàng", render: (o) => <span className="font-mono text-gray-500 dark:text-gray-400">#{o.order_id}</span> },
    { header: "Mặt hàng / Gian hàng", render: (o) => <ProductCell order={o} /> },
    { header: "Số tiền đã giải ngân", render: (o) => formatMoneyVietNam(o.settled_amount ?? 0) },
    {
      header: "Trạng thái",
      render: () => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-500">
          <PackageCheck className="size-3.5" /> Khách đã xác nhận nhận hàng
        </span>
      ),
    },
    { header: "Ngày hoàn tất", render: (o) => (o.completed_at ? formatDate(o.completed_at) : "—") },
    {
      header: "",
      align: "center",
      render: (o) => (
        <button
          onClick={() => setViewing(o)}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
        >
          <Eye className="size-3.5" /> Chi tiết
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quỹ sàn</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tổng quan tiền sàn đang tạm giữ hộ seller và lịch sử giải ngân.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Truck}
          label="Đang giữ (chưa hoàn tất đơn)"
          value={formatMoneyVietNam(summary?.total_held ?? 0)}
          hint="Đơn đã bàn giao, khách chưa xác nhận nhận hàng — có thể phải hoàn nếu giao thất bại."
          accent="bg-amber-500/15 text-amber-600 dark:text-amber-300"
        />
        <SummaryCard
          icon={PackageCheck}
          label="Có thể rút (chưa tạo yêu cầu)"
          value={formatMoneyVietNam(summary?.total_withdrawable ?? 0)}
          hint="Khách đã nhận hàng, tiền đã chốt cho seller nhưng seller chưa rút."
          accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
        />
        <SummaryCard
          icon={Landmark}
          label="Đã chi trả thực tế"
          value={formatMoneyVietNam(summary?.total_paid_out ?? 0)}
          hint="Tổng các yêu cầu rút tiền đã được admin duyệt."
          accent="bg-violet-500/15 text-violet-600 dark:text-violet-300"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("held")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            tab === "held"
              ? "bg-violet-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          Đang giữ
        </button>
        <button
          onClick={() => setTab("settlements")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            tab === "settlements"
              ? "bg-violet-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          Đã giải ngân
        </button>
      </div>

      {tab === "held" ? (
        <DataTable
          title="Tiền đang giữ"
          subtitle="Đơn đã bàn giao vận chuyển, chưa hoàn tất — tiền vẫn đứng ở ví pending của seller."
          data={held}
          columns={heldColumns}
          rowKey={(o) => o.id}
          currentPage={heldPage}
          totalPages={heldMeta.last_page}
          totalItems={heldMeta.total}
          onPageChange={setHeldPage}
        />
      ) : (
        <DataTable
          title="Lịch sử giải ngân"
          subtitle="Đơn đã hoàn tất — khách xác nhận nhận hàng, tiền đã chuyển sang có thể rút cho seller."
          data={settled}
          columns={settledColumns}
          rowKey={(o) => o.id}
          currentPage={settledPage}
          totalPages={settledMeta.last_page}
          totalItems={settledMeta.total}
          onPageChange={setSettledPage}
        />
      )}

      <PlatformFundOrderDetailModal open={!!viewing} order={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
