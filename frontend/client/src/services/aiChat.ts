import { apiPost } from "../libs/api";

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  discount_percent: number;
  final_price: number;
  thumbnail: string | null;
  stock: number;
  category: string | null;
  brand: string | null;
  store: string | null;
}

interface AiChatResponse {
  success: boolean;
  data: {
    reply: string;
    products: AiChatProduct[];
  };
}

export async function sendAiChatMessage(
  messages: AiChatMessage[],
): Promise<{ reply: string; products: AiChatProduct[] }> {
  const res = await apiPost<AiChatResponse>("/ai/chat", { messages });
  return res.data;
}
