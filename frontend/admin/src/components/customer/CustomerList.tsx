import { useEffect, useState } from "react";
import { Eye, User } from "lucide-react";
import { ToastContainer } from "react-toastify";
import DataTable, { Column } from "../common/DataTable";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { notifyError } from "../../helpers/notify";
import {
  CustomerRow,
  getCustomerDetail,
  getCustomers,
} from "../../services/customer.services";
import TierBadge from "./TierBadge";
import CustomerDetailModal, { CustomerDetail } from "./CustomerDetailModal";

const TIER_TABS = [
  { value: "", label: "Tất cả hạng" },
  { value: "dong", label: "Đồng" },
  { value: "bac", label: "Bạc" },
  { value: "vang", label: "Vàng" },
  { value: "kim_cuong", label: "Kim Cương" },
];

export default function CustomerList() {
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [tier, setTier] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = () => {
    getCustomers({ search: search || undefined, tier: tier || undefined, page: currentPage, per_page: 15 })
      .then((res) => {
        const page = res?.data;
        setItems(page?.data ?? []);
        setTotalPages(page?.last_page ?? 1);
        setTotalItems(page?.total ?? 0);
      })
      .catch(() => notifyError("Không tải được danh sách khách hàng"));
  };

  useEffect(load, [tier, search, currentPage]);

  const openDetail = async (id: number) => {
    try {
      const res = await getCustomerDetail(id);
      setDetail(res.data);
      setDetailOpen(true);
    } catch {
      notifyError("Không tải được chi tiết khách hàng");
    }
  };

  const columns: Column<CustomerRow>[] = [
    {
      header: "Khách hàng",
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/15 text-indigo-400">
            {c.avatar_url ? (
              <img src={c.avatar_url} alt={c.name} className="h-9 w-9 object-cover" />
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-gray-200">{c.name}</div>
            <div className="text-xs text-gray-500">@{c.username}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Liên hệ",
      render: (c) => (
        <div>
          <div className="text-gray-300">{c.email}</div>
          <div className="text-xs text-gray-500">{c.phone ?? "—"}</div>
        </div>
      ),
    },
    {
      header: "Hạng",
      align: "center",
      render: (c) => <TierBadge tier={c.tier} label={c.tier_label} />,
    },
    {
      header: "Tổng chi tiêu",
      align: "right",
      sortable: true,
      render: (c) => (
        <span className="font-semibold text-gray-100">{formatMoneyVietNam(c.total_spent)}</span>
      ),
    },
    {
      header: "Số đơn",
      align: "center",
      render: (c) => <span className="text-gray-300">{c.orders_count}</span>,
    },
    {
      header: "Tham gia",
      render: (c) => (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {c.created_at ? formatDate(c.created_at) : "—"}
        </span>
      ),
    },
    {
      header: "Thao tác",
      align: "center",
      render: (c) => (
        <button
          type="button"
          title="Xem chi tiết"
          className="cursor-pointer p-1 text-gray-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
          onClick={() => openDetail(c.id)}
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Danh Sách Khách Hàng"
        subtitle="Khách hàng đã đăng ký trên toàn sàn — chỉ xem, khách tự quản lý hồ sơ của họ."
        data={items}
        columns={columns}
        rowKey={(c) => c.id}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        searchValue={search}
        onSearch={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        filters={
          <div className="flex flex-wrap gap-2">
            {TIER_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTier(t.value);
                  setCurrentPage(1);
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  tier === t.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <CustomerDetailModal open={detailOpen} detail={detail} onClose={() => setDetailOpen(false)} />

      <ToastContainer />
    </>
  );
}
