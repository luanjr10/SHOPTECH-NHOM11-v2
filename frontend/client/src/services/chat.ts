import { apiAuthGet, apiPost, apiUpload } from "../libs/api";

export interface ChatStore {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
}

export interface ChatProduct {
  id: number;
  name: string;
  slug: string;
  final_price: number;
  thumbnail: string | null;
}

export interface ChatAttachment {
  type: "image" | "file";
  url: string;
  name: string;
  size: number;
}

export interface ChatMessage {
  id: number;
  sender_type: "customer" | "store";
  body: string | null;
  attachments: ChatAttachment[];
  created_at: string;
  product: ChatProduct | null;
}

export interface ChatConversationItem {
  id: number;
  store: ChatStore;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread: number;
}

export const getConversations = async (): Promise<ChatConversationItem[]> =>
  (await apiAuthGet<{ data: ChatConversationItem[] }>("/chat/conversations")).data;

export const startConversation = async (storeId: number): Promise<{ id: number; store: ChatStore }> =>
  (await apiPost<{ data: { id: number; store: ChatStore } }>("/chat/conversations", { store_id: storeId })).data;

export const getMessages = async (
  conversationId: number,
  afterId = 0,
): Promise<{ store: ChatStore; messages: ChatMessage[] }> =>
  (
    await apiAuthGet<{ data: { store: ChatStore; messages: ChatMessage[] } }>(
      `/chat/conversations/${conversationId}/messages?after_id=${afterId}`,
    )
  ).data;

export const sendMessage = async (
  conversationId: number,
  body: string,
  productId?: number | null,
  files: File[] = [],
): Promise<ChatMessage> => {
  const path = `/chat/conversations/${conversationId}/messages`;

  if (files.length === 0) {
    return (await apiPost<{ data: ChatMessage }>(path, { body, product_id: productId ?? undefined })).data;
  }

  const form = new FormData();
  if (body) form.append("body", body);
  if (productId) form.append("product_id", String(productId));
  files.forEach((f) => form.append("attachments[]", f));

  return (await apiUpload<{ data: ChatMessage }>(path, form)).data;
};

export const getUnreadCount = async (): Promise<number> =>
  (await apiAuthGet<{ data: { count: number } }>("/chat/unread-count")).data.count;

export const startSupportConversation = async (): Promise<{ id: number; store: ChatStore }> =>
  (await apiPost<{ data: { id: number; store: ChatStore } }>("/chat/support")).data;
