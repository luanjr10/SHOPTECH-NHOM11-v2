import { useCallback, useEffect, useState } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { getStockHistory, getStoreInventory } from "../../services/seller.services";
import { formatDate } from "../../helpers/formatDate";
import DataTable, { Column } from "../../components/common/DataTable";
import StockAdjustModal from "../../components/seller-center/StockAdjustModal";
import { InventoryItem, StockAdjustment } from "../../types/seller.types";

export default function SellerInventory() {
  const { activeStore } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [threshold, setThreshold] = useState(10);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [historyOf, setHistoryOf] = useState<InventoryItem | null>(null);

  // Đổi gian hàng / bộ lọc → quay về trang 1
  useEffect(() => setPage(1), [activeStore?.id, lowStockOnly]);

  const load = useCallback(() => {
    if (!activeStore) return;
    getStoreInventory(activeStore.id, { lowStockOnly, page }).then((res) => {
      setItems(res.data ?? []);
      setLastPage(res.meta?.last_page ?? 1);
      setTotal(res.meta?.total ?? 0);
      setThreshold(res.meta?.low_stock_threshold ?? 10);
    });
  }, [activeStore, lowStockOnly, page]);

  useEffect(load, [load]);

  if (!activeStore) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Kho hàng</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Bạn chưa có gian hàng nào.
        </div>
      </div>
    );
  }

  const columns: Column<InventoryItem>[] = [
    { header: "Mã", render: (p) => <span className="font-mono text-gray-500 dark:text-gray-400">{p.code}</span> },
    { header: "Sản phẩm", render: (p) => <span className="font-medium text-gray-800 dark:text-white">{p.name}</span> },
    {
      header: "Tồn kho",
      render: (p) => (
        <span className={p.low_stock ? "font-semibold text-rose-500" : "text-gray-700 dark:text-gray-300"}>
          {p.stock}
        </span>
      ),
    },
    {
      header: "Cảnh báo",
      render: (p) =>
        p.low_stock ? (
          <span className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-500">
            Sắp hết hàng
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      header: "Thao tác",
      align: "center",
      render: (p) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setAdjusting(p)}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
          >
            Điều chỉnh tồn kho
          </button>
          <button
            onClick={() => setHistoryOf(p)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50"
          >
            Lịch sử
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Kho hàng</h2>

      <DataTable
        title="Tồn kho"
        subtitle={`${activeStore.name} · cảnh báo khi tồn ≤ ${threshold}`}
        data={items}
        columns={columns}
        rowKey={(p) => p.id}
        currentPage={page}
        totalPages={lastPage}
        totalItems={total}
        onPageChange={setPage}
        filters={
          <button
            onClick={() => setLowStockOnly((v) => !v)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              lowStockOnly
                ? "bg-rose-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Chỉ hiện sắp hết hàng
          </button>
        }
      />

      <StockAdjustModal
        open={!!adjusting}
        storeId={activeStore.id}
        item={adjusting}
        onClose={() => setAdjusting(null)}
        onSaved={() => {
          setAdjusting(null);
          load();
        }}
      />

      <StockHistoryModal storeId={activeStore.id} item={historyOf} onClose={() => setHistoryOf(null)} />

      <ToastContainer />
    </div>
  );
}

function StockHistoryModal({
  storeId,
  item,
  onClose,
}: {
  storeId: number;
  item: InventoryItem | null;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<StockAdjustment[] | null>(null);

  useEffect(() => {
    setRows(null);
    if (item) getStockHistory(storeId, item.id).then(setRows).catch(() => setRows([]));
  }, [storeId, item]);

  return (
    <Modal show={!!item} size="2xl" popup onClose={onClose}>
      <ModalHeader />
      <ModalBody>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Lịch sử tồn kho — {item?.name}
        </h3>
        {rows === null ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có lần điều chỉnh nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-400">
                <tr>
                  <th className="py-2 pr-3">Thời gian</th>
                  <th className="py-2 pr-3">Thay đổi</th>
                  <th className="py-2 pr-3">Tồn kho</th>
                  <th className="py-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {rows.map((r) => (
                  <tr key={r.id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    <td className={`py-2 pr-3 font-semibold ${r.change > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {r.change > 0 ? `+${r.change}` : r.change}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {r.previous_stock} → {r.new_stock}
                    </td>
                    <td className="py-2">{r.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}
