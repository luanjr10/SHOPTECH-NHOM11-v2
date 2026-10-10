import { useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import ChatInbox, { type ChatInboxApi } from "../../components/chat/ChatInbox";
import {
  getStoreChatConversations,
  getStoreChatMessages,
  sendStoreChatMessage,
} from "../../services/seller.services";

export default function SellerChat() {
  const { activeStore } = useAuth();
  const storeId = activeStore?.id;

  const api = useMemo<ChatInboxApi | null>(
    () =>
      storeId
        ? {
            list: () => getStoreChatConversations(storeId),
            messages: (conversationId, afterId) => getStoreChatMessages(storeId, conversationId, afterId),
            send: (conversationId, body, files) => sendStoreChatMessage(storeId, conversationId, body, files),
          }
        : null,
    [storeId],
  );

  if (!activeStore || !api) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="font-sans text-2xl font-bold text-white">Tin nhắn khách hàng</h2>
        <p className="text-sm text-gray-400">Bạn cần tạo/chọn 1 gian hàng trước.</p>
      </div>
    );
  }

  return (
    <ChatInbox
      title="Tin nhắn khách hàng"
      subtitle={`Trả lời câu hỏi của khách cho gian hàng ${activeStore.name}.`}
      emptyText="Chưa có khách nào nhắn tin cho gian hàng."
      placeholder="Nhập tin nhắn trả lời khách..."
      api={api}
      resetKey={activeStore.id}
    />
  );
}
