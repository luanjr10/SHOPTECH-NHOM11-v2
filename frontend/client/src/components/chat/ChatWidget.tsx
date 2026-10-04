import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, Send, Sparkles, User, X } from "lucide-react";
import {
  sendAiChatMessage,
  type AiChatMessage,
  type AiChatProduct,
} from "../../services/aiChat";
import { formatPrice } from "../../libs/format";

interface ChatBubble {
  role: "user" | "assistant";
  content: string;
  products?: AiChatProduct[];
}

const STORAGE_KEY = "shoptech_ai_chat_history";

const SUGGESTIONS = [
  "Tư vấn điện thoại tầm 10 triệu",
  "Laptop nào phù hợp cho sinh viên?",
  "Phí ship và thời gian nhận hàng?",
  "Chính sách đổi trả như thế nào?",
];

const WELCOME_MESSAGE: ChatBubble = {
  role: "assistant",
  content:
    "Xin chào! Mình là trợ lý AI của ShopTech 👋\nMình có thể giúp bạn tìm sản phẩm phù hợp hoặc giải đáp thắc mắc về đơn hàng, vận chuyển, thanh toán. Bạn cần hỗ trợ gì nào?",
};

function loadHistory(): ChatBubble[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(raw) as ChatBubble[];
    return parsed.length > 0 ? parsed : [WELCOME_MESSAGE];
  } catch {
    return [WELCOME_MESSAGE];
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatBubble[]>(loadHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const nextMessages: ChatBubble[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const history: AiChatMessage[] = nextMessages
        .filter((m) => m.content.trim() !== "")
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

      const { reply, products } = await sendAiChatMessage(history);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, products },
      ]);
    } catch {
      setError("Không gửi được tin nhắn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  const { pathname } = useLocation();
  const hideLauncherOnMobile =
    !open && (pathname === "/gio-hang" || pathname === "/thanh-toan");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI tư vấn"}
        className={`fixed bottom-4 right-4 z-[60] h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary500 to-red-700 text-white shadow-[0_8px_24px_rgba(215,0,24,0.35)] transition-transform duration-200 hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6 sm:flex sm:h-14 sm:w-14 ${
          hideLauncherOnMobile ? "hidden" : "flex"
        }`}
      >
        {open ? (
          <X size={24} />
        ) : (
          <span className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary500/40" />
            <Sparkles size={24} className="relative" />
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-[76px] z-[60] flex h-[min(75dvh,600px)] flex-col sm:inset-x-auto sm:w-[380px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)] sm:bottom-24 sm:right-6">
          <div className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-primary500 to-red-700 px-4 py-3.5 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Bot size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14px] font-bold leading-tight">
                Trợ lý AI ShopTech
              </h3>
              <p className="flex items-center gap-1 text-[11px] text-white/85">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Tư vấn sản phẩm &amp; giải đáp thắc mắc
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-4"
          >
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary500/10 text-primary500">
                  <Bot size={15} />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-center text-[12px] text-red-500">{error}</p>
            )}

            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="rounded-full border border-primary300/40 bg-white px-3 py-1.5 text-[12px] font-medium text-primary500 transition-colors hover:bg-primary500 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex shrink-0 items-center gap-2 border-t border-gray-100 bg-white p-2.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              maxLength={500}
              disabled={loading}
              className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-gray-800 outline-none transition-colors focus:border-primary300 focus:bg-white disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Gửi"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary500 text-white transition-transform disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:scale-105 enabled:active:scale-95"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function MessageBubble({ message }: { message: ChatBubble }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-gray-200 text-gray-600"
            : "bg-primary500/10 text-primary500"
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={15} />}
      </div>

      <div className={`flex max-w-[80%] flex-col gap-2`}>
        <div
          className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
            isUser
              ? "rounded-br-sm bg-primary500 text-white"
              : "rounded-bl-sm bg-white text-gray-800"
          }`}
        >
          {message.content}
        </div>

        {message.products && message.products.length > 0 && (
          <div className="flex flex-col gap-2">
            {message.products.map((p) => (
              <ProductSuggestionCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductSuggestionCard({ product }: { product: AiChatProduct }) {
  const hasDiscount = product.discount_percent > 0;

  return (
    <Link
      to={`/san-pham/${product.slug}`}
      className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-2 shadow-sm transition-colors hover:border-primary300/50"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[9px] text-gray-300">Không có ảnh</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-gray-800">
          {product.name}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[13px] font-bold text-primary500">
            {formatPrice(product.final_price)}
          </span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
        {product.stock <= 0 && (
          <span className="text-[10px] font-medium text-gray-400">
            Tạm hết hàng
          </span>
        )}
      </div>
    </Link>
  );
}
