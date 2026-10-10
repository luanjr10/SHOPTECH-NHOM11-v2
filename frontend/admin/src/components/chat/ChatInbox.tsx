import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileText, Loader2, MessageCircle, Paperclip, Send, User, X } from "lucide-react";
import { formatMoneyVietNam } from "../../helpers/formatMoney";

export interface ChatCustomer {
  id: number;
  name: string;
  username: string | null;
}

export interface ChatConversation {
  id: number;
  customer: ChatCustomer;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread: number;
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
  attachments?: ChatAttachment[];
  created_at: string;
  product: { id: number; name: string; slug: string; final_price: number; thumbnail: string | null } | null;
}

export interface ChatInboxApi {
  list: () => Promise<{ conversations: ChatConversation[] }>;
  messages: (conversationId: number, afterId: number) => Promise<{ messages: ChatMessage[] }>;
  send: (conversationId: number, body: string, files: File[]) => Promise<ChatMessage>;
}

interface ChatInboxProps {
  title: string;
  subtitle: string;
  emptyText: string;
  placeholder?: string;
  api: ChatInboxApi;
  /** Đổi giá trị này (vd. chọn gian hàng khác) để đặt lại hộp thư. */
  resetKey: string | number;
}

const POLL_MS = 3000;
const MAX_FILES = 5;
const MAX_FILE_MB = 10;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return Math.max(1, Math.round(bytes / 1024)) + " KB";
}

function AttachmentList({ items }: { items: ChatAttachment[] }) {
  const images = items.filter((a) => a.type === "image");
  const files = items.filter((a) => a.type === "file");

  return (
    <>
      {images.length > 0 && (
        <div className={"grid gap-1 " + (images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {images.map((img) => (
            <a key={img.url} href={img.url} target="_blank" rel="noreferrer">
              <img src={img.url} alt={img.name} loading="lazy" className="max-h-56 w-full rounded-xl border border-gray-700 object-cover" />
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
          className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2"
        >
          <FileText className="h-5 w-5 shrink-0 text-indigo-300" />
          <span className="min-w-0">
            <span className="line-clamp-1 block break-all text-xs font-semibold text-gray-200">{file.name}</span>
            <span className="block text-[11px] text-gray-500">{formatSize(file.size)}</span>
          </span>
        </a>
      ))}
    </>
  );
}

function Thread({
  api,
  conversation,
  placeholder,
  onBack,
}: {
  api: ChatInboxApi;
  conversation: ChatConversation;
  placeholder: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  const pickFiles = (picked: File[]) => {
    const tooBig = picked.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      setError('"' + tooBig.name + '" vượt quá ' + MAX_FILE_MB + 'MB.');
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
  };

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
    setFiles([]);
    setLoading(true);

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await api.messages(conversation.id, lastIdRef.current);
        if (active) append(res.messages ?? []);
      } catch {
        // thử lại ở lần poll sau
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
  }, [api, conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body && files.length === 0) return;
    setSending(true);
    setError(null);
    try {
      append([await api.send(conversation.id, body, files)]);
      setText("");
      setFiles([]);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Gửi tin nhắn thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        <button type="button" onClick={onBack} className="md:hidden" aria-label="Quay lại">
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </button>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
          <User className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-100">{conversation.customer.name}</p>
          {conversation.customer.username && <p className="text-xs text-gray-500">@{conversation.customer.username}</p>}
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_type === "store";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[80%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                  {m.product && (
                    <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 p-2">
                      {m.product.thumbnail ? (
                        <img src={m.product.thumbnail} alt="" className="h-12 w-12 rounded-lg object-contain" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-800" />
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-xs font-semibold text-gray-200">{m.product.name}</p>
                        <p className="text-xs font-bold text-indigo-300">{formatMoneyVietNam(m.product.final_price)}</p>
                      </div>
                    </div>
                  )}
                  <AttachmentList items={m.attachments ?? []} />
                  {m.body && (
                    <div
                      className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                        mine ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md bg-gray-800 text-gray-100"
                      }`}
                    >
                      {m.body}
                    </div>
                  )}
                  <span className="px-1 text-[10px] text-gray-500">
                    {new Date(m.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gray-800 px-3 pt-3">
          {files.map((file, i) => (
            <div key={file.name + i} className="relative">
              {previews[i] ? (
                <img src={previews[i]!} alt={file.name} className="h-16 w-16 rounded-lg border border-gray-700 object-cover" />
              ) : (
                <div className="flex h-16 max-w-[170px] items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-2.5">
                  <FileText className="h-5 w-5 shrink-0 text-indigo-300" />
                  <span className="min-w-0">
                    <span className="line-clamp-1 block break-all text-[11px] font-semibold text-gray-200">{file.name}</span>
                    <span className="block text-[10px] text-gray-500">{formatSize(file.size)}</span>
                  </span>
                </div>
              )}
              <button
                type="button"
                aria-label="Bỏ tệp"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-600 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="px-3 pt-2 text-xs text-rose-400">{error}</p>}

      <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-gray-800 p-3">
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-300 disabled:opacity-40"
        >
          <Paperclip className="h-4 w-4" />
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
          placeholder={placeholder}
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={sending || (!text.trim() && files.length === 0)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white disabled:opacity-50"
          aria-label="Gửi"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

export default function ChatInbox({
  title,
  subtitle,
  emptyText,
  placeholder = "Nhập tin nhắn trả lời...",
  api,
  resetKey,
}: ChatInboxProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api
      .list()
      .then((data) => setConversations(data?.conversations ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    setActiveId(null);
    setLoading(true);
    load();
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, resetKey]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div>
        <h2 className="font-sans text-2xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60">
        <div className="flex h-[65vh] min-h-[420px]">
          <aside
            className={`w-full shrink-0 flex-col border-r border-gray-800 md:flex md:w-[300px] ${activeId ? "hidden" : "flex"}`}
          >
            <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
              <MessageCircle className="h-5 w-5 text-indigo-400" />
              <span className="text-sm font-semibold text-gray-100">Cuộc trò chuyện</span>
              {unreadTotal > 0 && (
                <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
                  {unreadTotal} chưa đọc
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">{emptyText}</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-800/60 ${
                      activeId === c.id ? "bg-gray-800/80" : ""
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
                      <User className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 block text-sm font-semibold text-gray-100">{c.customer.name}</span>
                      <span className="line-clamp-1 block text-xs text-gray-500">{c.last_message_preview}</span>
                    </span>
                    {c.unread > 0 && (
                      <span className="flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className={`min-w-0 flex-1 flex-col md:flex ${activeId ? "flex" : "hidden"}`}>
            {active ? (
              <Thread
                api={api}
                conversation={active}
                placeholder={placeholder}
                onBack={() => {
                  setActiveId(null);
                  load();
                }}
              />
            ) : (
              <div className="hidden flex-1 flex-col items-center justify-center gap-2 text-gray-500 md:flex">
                <MessageCircle className="h-10 w-10" />
                <p className="text-sm">Chọn một cuộc trò chuyện để trả lời</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
