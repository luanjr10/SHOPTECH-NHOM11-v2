import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { formatPrice } from "../../libs/format";
import { type ApiError } from "../../libs/api";
import {
  getMessages,
  sendMessage,
  type ChatAttachment,
  type ChatMessage,
  type ChatProduct,
} from "../../services/chat";

const POLL_MS = 3000;
const MAX_FILES = 5;
const MAX_FILE_MB = 10;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip";

interface ChatThreadProps {
  conversationId: number;
  /** Sản phẩm khách đang xem, cho phép gửi kèm vào cuộc trò chuyện. */
  pendingProduct?: ChatProduct | null;
  onProductSent?: () => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Attachments({ items, mine }: { items: ChatAttachment[]; mine: boolean }) {
  const images = items.filter((a) => a.type === "image");
  const files = items.filter((a) => a.type === "file");

  return (
    <>
      {images.length > 0 && (
        <div className={`grid gap-1 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {images.map((img) => (
            <a key={img.url} href={img.url} target="_blank" rel="noreferrer">
              <img
                src={img.url}
                alt={img.name}
                loading="lazy"
                className="max-h-56 w-full rounded-xl border border-gray-200 object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {files.map((file) => (
        <a
          key={file.url}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          download={file.name}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            mine ? "border-primary500/30 bg-primary500/10" : "border-gray-200 bg-white"
          }`}
        >
          <FileText className="size-5 shrink-0 text-primary500" />
          <span className="min-w-0">
            <span className="line-clamp-1 block break-all font-sans text-[12px] font-semibold text-gray-800">
              {file.name}
            </span>
            <span className="block font-sans text-[11px] text-gray-400">{formatSize(file.size)}</span>
          </span>
        </a>
      ))}
    </>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.sender_type === "customer";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {message.product && (
          <Link
            to={`/san-pham/${message.product.slug}`}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm"
          >
            {message.product.thumbnail ? (
              <img src={message.product.thumbnail} alt="" className="size-12 rounded-lg object-contain" />
            ) : (
              <div className="size-12 rounded-lg bg-gray-100" />
            )}
            <span className="min-w-0">
              <span className="line-clamp-1 block font-sans text-[12px] font-semibold text-gray-800">
                {message.product.name}
              </span>
              <span className="block font-sans text-[12px] font-bold text-primary500">
                {formatPrice(message.product.final_price)}
              </span>
            </span>
          </Link>
        )}
        <Attachments items={message.attachments ?? []} mine={mine} />
        {message.body && (
          <div
            className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 font-sans text-[13px] ${
              mine ? "rounded-br-md bg-primary500 text-white" : "rounded-bl-md bg-gray-100 text-gray-800"
            }`}
          >
            {message.body}
          </div>
        )}
        <span className="px-1 font-sans text-[10px] text-gray-400">
          {new Date(message.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export function ChatThread({ conversationId, pendingProduct, onProductSent }: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachProduct, setAttachProduct] = useState<ChatProduct | null>(pendingProduct ?? null);

  const lastIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
    [files],
  );
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  const append = (incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((m) => m.id));
  };

  useEffect(() => {
    let active = true;
    lastIdRef.current = 0;
    setMessages([]);
    setLoading(true);
    setFiles([]);

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await getMessages(conversationId, lastIdRef.current);
        if (active) append(res.messages);
      } catch {
        // mất mạng tạm thời: lần poll sau sẽ thử lại
      } finally {
        if (active) setLoading(false);
      }
    };

    poll();
    const timer = window.setInterval(poll, POLL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    setAttachProduct(pendingProduct ?? null);
  }, [pendingProduct, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const pickFiles = (picked: File[]) => {
    const tooBig = picked.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      setError(`"${tooBig.name}" vượt quá ${MAX_FILE_MB}MB.`);
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body && !attachProduct && files.length === 0) return;

    setSending(true);
    setError(null);
    try {
      const message = await sendMessage(
        conversationId,
        body || (attachProduct && files.length === 0 ? `Mình quan tâm sản phẩm này: ${attachProduct.name}` : ""),
        attachProduct?.id,
        files,
      );
      append([message]);
      setText("");
      setFiles([]);
      if (attachProduct) {
        setAttachProduct(null);
        onProductSent?.();
      }
    } catch (err) {
      setError((err as ApiError)?.message ?? "Gửi tin nhắn thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3 sm:p-4">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-400">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center font-sans text-[13px] text-gray-400">
            Hãy gửi lời chào đến gian hàng để bắt đầu trò chuyện.
          </p>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {attachProduct && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-primary500/30 bg-primary500/5 p-2 sm:mx-4">
          {attachProduct.thumbnail && (
            <img src={attachProduct.thumbnail} alt="" className="size-10 rounded-lg object-contain" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-[11px] text-gray-500">Gửi kèm sản phẩm</span>
            <span className="line-clamp-1 block font-sans text-[12px] font-semibold text-gray-800">
              {attachProduct.name}
            </span>
          </span>
          <button type="button" onClick={() => setAttachProduct(null)} aria-label="Bỏ sản phẩm đính kèm">
            <X className="size-4 text-gray-400" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="mx-3 mb-2 flex flex-wrap gap-2 sm:mx-4">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative">
              {previews[i] ? (
                <img src={previews[i]!} alt={file.name} className="size-16 rounded-lg border border-gray-200 object-cover" />
              ) : (
                <div className="flex h-16 max-w-[160px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5">
                  <FileText className="size-5 shrink-0 text-primary500" />
                  <span className="min-w-0">
                    <span className="line-clamp-1 block break-all font-sans text-[11px] font-semibold text-gray-700">
                      {file.name}
                    </span>
                    <span className="block font-sans text-[10px] text-gray-400">{formatSize(file.size)}</span>
                  </span>
                </div>
              )}
              <button
                type="button"
                aria-label="Bỏ tệp"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gray-800 text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="px-4 pb-1 font-sans text-[12px] text-rose-500">{error}</p>}

      <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-gray-100 p-3 sm:p-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            pickFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= MAX_FILES}
          aria-label="Đính kèm ảnh hoặc tệp"
          title={`Đính kèm ảnh/tệp (tối đa ${MAX_FILES}, mỗi tệp ${MAX_FILE_MB}MB)`}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-primary500 hover:text-primary500 disabled:opacity-40"
        >
          <Paperclip className="size-4" />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          onPaste={(e) => {
            const pasted = Array.from(e.clipboardData.files);
            if (pasted.length) {
              e.preventDefault();
              pickFiles(pasted);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Nhập tin nhắn..."
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 font-sans text-[13px] outline-none focus:border-primary500"
        />
        <button
          type="submit"
          disabled={sending || (!text.trim() && !attachProduct && files.length === 0)}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary500 text-white disabled:opacity-50"
          aria-label="Gửi"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}
