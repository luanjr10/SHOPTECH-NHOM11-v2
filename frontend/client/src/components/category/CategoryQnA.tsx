import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Loader2, MessageSquareReply, Send, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getCategoryComments, submitCategoryComment } from "../../services/reviews";
import { type CategoryComment } from "../../types/review";

const AVATAR_COLORS = [
  "bg-lime-700",
  "bg-purple-700",
  "bg-rose-600",
  "bg-sky-700",
  "bg-amber-600",
  "bg-teal-700",
];

function avatarColorFor(userId: number | undefined): string {
  if (!userId) return AVATAR_COLORS[0];
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "1 ngày trước";
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

interface Props {
  categoryId: number;
}

export function CategoryQnA({ categoryId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CategoryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = () => {
    setLoading(true);
    getCategoryComments(categoryId)
      .then(setComments)
      .catch((error) => console.error("Không tải được Hỏi & đáp:", error))
      .finally(() => setLoading(false));
  };

  useEffect(load, [categoryId]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      await submitCategoryComment(categoryId, { body: question.trim() });
      setQuestion("");
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await submitCategoryComment(categoryId, { body: replyText.trim(), parent_id: parentId });
      setReplyText("");
      setReplyingTo(null);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl bg-gray-50 p-4 sm:p-6">
      <h2 className="mb-4 font-sans text-[18px] font-bold text-gray-800">Hỏi và đáp</h2>

      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <img
          src="https://cdn2.cellphones.com.vn/insecure/rs:fill:0:0/q:90/plain/https://cellphones.com.vn/media/wysiwyg/ant-smile.png"
          alt="ShopTech"
          className="hidden size-16 shrink-0 sm:block"
        />
        <div className="flex-1">
          <p className="font-sans text-[16px] font-semibold text-gray-800">Hãy đặt câu hỏi cho chúng tôi</p>
          <p className="mt-1 font-sans text-[13px] text-gray-500">
            Đội ngũ ShopTech sẽ phản hồi sớm nhất có thể. Thông tin có thể thay đổi theo thời
            gian, vui lòng đặt câu hỏi để nhận được cập nhật mới nhất!
          </p>

          {user ? (
            <form onSubmit={handleAsk} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Viết câu hỏi của bạn tại đây"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 font-sans text-[14px] outline-none focus:border-primary500"
              />
              <button
                type="submit"
                disabled={submitting || !question.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary500 px-5 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-50 cursor-pointer"
              >
                Gửi câu hỏi
                <Send className="size-4" />
              </button>
            </form>
          ) : (
            <p className="mt-3 rounded-lg bg-gray-50 px-4 py-2.5 font-sans text-[13px] text-gray-500">
              <Link to="/login" className="font-semibold text-primary500 hover:underline">
                Đăng nhập
              </Link>{" "}
              để đặt câu hỏi cho danh mục này.
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-primary500" />
        </div>
      ) : comments.length === 0 ? (
        <p className="mt-4 rounded-xl bg-white py-8 text-center font-sans text-[13px] text-gray-400 shadow-sm">
          Chưa có câu hỏi nào — hãy là người đầu tiên!
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {comments.map((thread) => (
            <div key={thread.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`flex size-8 items-center justify-center rounded-full font-sans text-[13px] font-bold text-white ${avatarColorFor(thread.user?.id)}`}
                >
                  {(thread.user?.name ?? "?").charAt(0).toUpperCase()}
                </div>
                <span className="font-sans text-[14px] font-bold text-gray-800">
                  {thread.user?.name ?? "Ẩn danh"}
                </span>
                {thread.is_admin && (
                  <span className="inline-flex items-center gap-1 rounded bg-primary500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    <ShieldCheck className="size-3" /> QTV
                  </span>
                )}
                <span className="flex items-center gap-1 font-sans text-[12px] text-gray-400">
                  <Clock className="size-3" />
                  {formatRelative(thread.created_at)}
                </span>
              </div>

              <p className="mt-2 font-sans text-[14px] text-gray-700">{thread.body}</p>

              {thread.replies?.map((reply) => (
                <div key={reply.id} className="mt-3 flex gap-2 border-l-2 border-primary200 pl-3">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full font-sans text-[12px] font-bold text-white ${
                      reply.is_admin ? "bg-primary500" : avatarColorFor(reply.user?.id)
                    }`}
                  >
                    {(reply.user?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-[13px] font-bold text-gray-800">
                        {reply.user?.name ?? "Ẩn danh"}
                      </span>
                      {reply.is_admin && (
                        <span className="rounded bg-primary500 px-1.5 text-[10px] font-bold text-white">
                          QTV
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-sans text-[13px] leading-relaxed text-gray-600">{reply.body}</p>
                  </div>
                </div>
              ))}

              {user && (
                <div className="mt-2">
                  {replyingTo === thread.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Viết phản hồi..."
                        autoFocus
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 font-sans text-[13px] outline-none focus:border-primary500"
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(thread.id)}
                        disabled={submitting || !replyText.trim()}
                        className="shrink-0 rounded-lg bg-primary500 px-3 py-1.5 font-sans text-[12px] font-semibold text-white disabled:opacity-50 cursor-pointer"
                      >
                        Gửi
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="shrink-0 font-sans text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        Huỷ
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReplyingTo(thread.id)}
                      className="flex items-center gap-1 font-sans text-[13px] font-medium text-primary500 cursor-pointer"
                    >
                      <MessageSquareReply className="size-4" />
                      Phản hồi
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
