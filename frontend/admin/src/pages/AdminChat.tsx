import ChatInbox, { type ChatInboxApi } from "../components/chat/ChatInbox";
import api from "../api/axios";
import { buildChatForm } from "../services/seller.services";

const adminChatApi: ChatInboxApi = {
  list: async () => (await api.get("admin/chat/conversations")).data.data,
  messages: async (conversationId, afterId) =>
    (await api.get(`admin/chat/conversations/${conversationId}/messages`, { params: { after_id: afterId } })).data.data,
  send: async (conversationId, body, files) =>
    (await api.post(`admin/chat/conversations/${conversationId}/messages`, buildChatForm(body, files))).data.data,
};

export default function AdminChatPage() {
  return (
    <ChatInbox
      title="Hỗ trợ khách hàng"
      subtitle="Khách hàng chat trực tiếp với ShopTech về đơn hàng, thanh toán, khiếu nại."
      emptyText="Chưa có khách hàng nào nhắn tin hỗ trợ."
      placeholder="Nhập tin nhắn trả lời khách..."
      api={adminChatApi}
      resetKey="support"
    />
  );
}
