import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Headset, Loader2, MessageCircle, Store } from "lucide-react";
import { ChatThread } from "../../components/chat/ChatThread";
import { getProductDetail } from "../../services/catalog";
import {
  getConversations,
  startConversation,
  startSupportConversation,
  type ChatConversationItem,
  type ChatProduct,
  type ChatStore,
} from "../../services/chat";

function StoreAvatar({ store }: { store: ChatStore }) {
  if (store.id === 0) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary500 text-white">
        <Headset className="size-5" />
      </span>
    );
  }

  return store.logo ? (
    <img src={store.logo} alt={store.name} className="size-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary500/10 text-primary500">
      <Store className="size-5" />
    </span>
  );
}

function MessagesTab() {
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeStore, setActiveStore] = useState<ChatStore | null>(null);
  const [pendingProduct, setPendingProduct] = useState<ChatProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(
    () => getConversations().then(setConversations).catch(() => undefined),
    [],
  );

  useEffect(() => {
    const storeId = Number(params.get("store"));
    const productSlug = params.get("product");
    const wantsSupport = params.get("support") === "1";

    const init = async () => {
      await refreshList();

      if (wantsSupport) {
        try {
          const conversation = await startSupportConversation();
          setActiveId(conversation.id);
          setActiveStore(conversation.store);
        } catch (err) {
          setError((err as Error)?.message ?? "Không mở được cuộc trò chuyện");
        } finally {
          setParams({}, { replace: true });
        }
      }

      if (storeId > 0) {
        try {
          const conversation = await startConversation(storeId);
          setActiveId(conversation.id);
          setActiveStore(conversation.store);

          if (productSlug) {
            const detail = await getProductDetail(productSlug).catch(() => null);
            if (detail) {
              setPendingProduct({
                id: detail.id,
                name: detail.name,
                slug: detail.slug,
                final_price: detail.final_price,
                thumbnail: detail.images[0] ?? null,
              });
            }
          }
        } catch (err) {
          setError((err as Error)?.message ?? "Không mở được cuộc trò chuyện");
        } finally {
          setParams({}, { replace: true });
        }
      }
    };

    init().finally(() => setLoading(false));
    // chỉ chạy một lần khi vào trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) refreshList();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [refreshList]);

  const openSupport = async () => {
    try {
      const conversation = await startSupportConversation();
      setActiveId(conversation.id);
      setActiveStore(conversation.store);
      setPendingProduct(null);
    } catch (err) {
      setError((err as Error)?.message ?? "Không mở được cuộc trò chuyện");
    }
  };

  const open = (item: ChatConversationItem) => {
    setActiveId(item.id);
    setActiveStore(item.store);
    setPendingProduct(null);
    setConversations((prev) => prev.map((c) => (c.id === item.id ? { ...c, unread: 0 } : c)));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const listItems =
    activeId && !conversations.some((c) => c.id === activeId) && activeStore
      ? [
          {
            id: activeId,
            store: activeStore,
            last_message_preview: null,
            last_message_at: null,
            unread: 0,
          } satisfies ChatConversationItem,
          ...conversations,
        ]
      : conversations;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex h-[70vh] min-h-[420px]">
        <aside className={`w-full shrink-0 flex-col border-r border-gray-100 md:flex md:w-[280px] ${activeId ? "hidden" : "flex"}`}>
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <MessageCircle className="size-5 text-primary500" />
            <h2 className="font-sans text-[15px] font-bold text-gray-800">Tin nhắn</h2>
          </div>
          <button
            type="button"
            onClick={openSupport}
            className="flex items-center gap-3 border-b border-gray-100 bg-primary500/5 px-4 py-3 text-left transition-colors hover:bg-primary500/10"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary500 text-white">
              <Headset className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-sans text-[13px] font-semibold text-gray-800">Chat với ShopTech</span>
              <span className="block font-sans text-[12px] text-gray-500">Hỗ trợ đơn hàng, thanh toán, khiếu nại</span>
            </span>
          </button>
          <div className="flex-1 overflow-y-auto">
            {listItems.length === 0 ? (
              <p className="p-4 text-center font-sans text-[13px] text-gray-400">
                Chưa có cuộc trò chuyện nào. Bấm "Chat ngay" ở trang sản phẩm hoặc gian hàng để hỏi người bán.
              </p>
            ) : (
              listItems.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => open(c)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                    activeId === c.id ? "bg-primary500/5" : ""
                  }`}
                >
                  <StoreAvatar store={c.store} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block font-sans text-[13px] font-semibold text-gray-800">
                      {c.store.name}
                    </span>
                    <span className="line-clamp-1 block font-sans text-[12px] text-gray-500">
                      {c.last_message_preview ?? "Chưa có tin nhắn"}
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span className="flex min-w-5 items-center justify-center rounded-full bg-primary500 px-1.5 py-0.5 font-sans text-[11px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={`min-w-0 flex-1 flex-col md:flex ${activeId ? "flex" : "hidden"}`}>
          {activeId && activeStore ? (
            <>
              <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 sm:px-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(null);
                    refreshList();
                  }}
                  className="md:hidden"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="size-5 text-gray-500" />
                </button>
                <StoreAvatar store={activeStore} />
                <span className="font-sans text-[14px] font-bold text-gray-800">{activeStore.name}</span>
              </div>
              <div className="min-h-0 flex-1">
                <ChatThread
                  conversationId={activeId}
                  pendingProduct={pendingProduct}
                  onProductSent={() => {
                    setPendingProduct(null);
                    refreshList();
                  }}
                />
              </div>
            </>
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center gap-2 text-gray-400 md:flex">
              <MessageCircle className="size-10" />
              <p className="font-sans text-[13px]">Chọn một cuộc trò chuyện để bắt đầu</p>
            </div>
          )}
        </section>
      </div>
      {error && <p className="border-t border-gray-100 px-4 py-2 font-sans text-[12px] text-rose-500">{error}</p>}
    </div>
  );
}

export default MessagesTab;
