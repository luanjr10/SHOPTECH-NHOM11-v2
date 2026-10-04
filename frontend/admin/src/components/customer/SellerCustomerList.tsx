import { useEffect, useState } from "react";
import { Eye, User } from "lucide-react";
import { ToastContainer } from "react-toastify";
import DataTable, { Column } from "../common/DataTable";
import { formatDate } from "../../helpers/formatDate";
import { formatMoneyVietNam } from "../../helpers/formatMoney";
import { notifyError } from "../../helpers/notify";
import { useAuth } from "../../context/AuthContext";
import {
  getStoreCustomerDetail,
  getStoreCustomers,
} from "../../services/customer.services";
import TierBadge from "./TierBadge";
import CustomerDetailModal, { CustomerDetail } from "./CustomerDetailModal";

interface StoreCustomerRow {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string | null;
  store_spent: number;
  store_orders_count: number;
  last_order_at?: string | null;
  tier: string;
  tier_label: string;
}

export default function SellerCustomerList() {
  const { activeStore } = useAuth();
  const [items, setItems] = useState<StoreCustomerRow[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = () => {
    if (!activeStore) return;
    getStoreCustomers(activeStore.id, { search: search || undefined, page: currentPage, per_page: 15 })
      .then((res) => {
        const page = res?.data;
        setItems(page?.data ?? []);
        setTotalPages(page?.last_page ?? 1);
        setTotalItems(page?.total ?? 0);
      })
      .catch(() => notifyError("Không tải được danh sách khách hàng"));
  };

  useEffect(load, [activeStore, search, currentPage]);

  const openDetail = async (id: number) => {
    if (!activeStore) return;
    try {
      const res = await getStoreCustomerDetail(activeStore.id, id);
      setDetail(res.data);
      setDetailOpen(true);
    } catch {
      notifyError("Không tải được chi tiết khách hàng");
    }
  };

  const columns: Column<StoreCustomerRow>[] = [
    {
      header: "Khách hàng",
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
            <User className="h-4 w-4" />
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
      header: "Hạng thành viên",
      align: "center",
      render: (c) => <TierBadge tier={c.tier} label={c.tier_label} />,
    },
    {
      header: "Đã chi tại gian hàng",
      align: "right",
      render: (c) => (
        <span className="font-semibold text-gray-100">{formatMoneyVietNam(c.store_spent)}</span>
      ),
    },
    {
      header: "Số đơn",
      align: "center",
      render: (c) => <span className="text-gray-300">{c.store_orders_count}</span>,
    },
    {
      header: "Đơn gần nhất",
      render: (c) => (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {c.last_order_at ? formatDate(c.last_order_at) : "—"}
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
        title="Khách Hàng Của Gian Hàng"
        subtitle="Khách hàng đã từng mua tại gian hàng đang chọn — chỉ xem, khách tự quản lý hồ sơ của họ."
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
      />

      <CustomerDetailModal open={detailOpen} detail={detail} onClose={() => setDetailOpen(false)} />

      <ToastContainer />
    </>
  );
}
