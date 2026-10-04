import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageCircleQuestion, Send, ShieldCheck, Store, User } from "lucide-react";
import { getProductComments, submitProductComment } from "../../services/reviews";
import type { ProductComment } from "../../types/review";
import { useAuth } from "../../context/AuthContext";

function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "1 ngày trước";
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

function AuthorBadge({ comment }: { comment: ProductComment }) {
  if (comment.is_admin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-sans text-[11px] font-semibold text-rose-600">
        <ShieldCheck className="size-3" /> Quản trị viên
      </span>
    );
  }
  if (comment.is_seller_of_store) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary500/10 px-2 py-0.5 font-sans text-[11px] font-semibold text-primary500">
        <Store className="size-3" /> Người bán
      </span>
    );
  }
  return null;
}

function CommentRow({ comment, isReply = false }: { comment: ProductComment; isReply?: boolean }) {
  return (
    <div className={`flex gap-3 ${isReply ? "pl-11" : ""}`}>
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary500/10 text-primary500">
        {comment.user?.avatar_url ? (
          <img src={comment.user.avatar_url} alt={comment.user.name} className="size-full object-cover" />
        ) : (
          <User className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-[13px] font-semibold text-gray-800">{comment.user?.name ?? "Ẩn danh"}</span>
          <AuthorBadge comment={comment} />
          <span className="font-sans text-[11px] text-gray-400">{formatRelative(comment.created_at)}</span>
        </div>
        <p className="mt-1 font-sans text-[13px] text-gray-700">{comment.body}</p>
      </div>
    </div>
  );
}

interface Props {
  productId: number;
}

export function ProductQA({ productId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = () => {
    setLoading(true);
    getProductComments(productId)
      .then(setComments)
      .finally(() => setLoading(false));
  };

  useEffect(load, [productId]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      await submitProductComment(productId, { body: question.trim() });
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
      await submitProductComment(productId, { body: replyText.trim(), parent_id: parentId });
      setReplyText("");
      setReplyingTo(null);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-sans text-[16px] font-bold text-gray-900">
        <MessageCircleQuestion className="size-5 text-primary500" />
        Hỏi &amp; đáp
      </h2>

      {user ? (
        <form onSubmit={handleAsk} className="mb-5 flex items-center gap-2 rounded-xl border border-gray-200 p-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Đặt câu hỏi về sản phẩm này..."
            className="flex-1 bg-transparent px-2 py-1.5 font-sans text-[13px] outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !question.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary500 px-4 py-2 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-primary500/90 disabled:opacity-50"
          >
            <Send className="size-3.5" /> Gửi
          </button>
        </form>
      ) : (
        <p className="mb-5 rounded-xl bg-gray-50 px-4 py-3 font-sans text-[13px] text-gray-500">
          <Link to="/login" className="font-semibold text-primary500 hover:underline">
            Đăng nhập
          </Link>{" "}
          để đặt câu hỏi hoặc bình luận về sản phẩm này.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-primary500" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-8 text-center font-sans text-[13px] text-gray-400">Chưa có câu hỏi nào — hãy là người đầu tiên!</p>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-3 border-b border-gray-50 pb-5 last:border-0 last:pb-0">
              <CommentRow comment={comment} />

              {comment.replies?.map((reply) => (
                <CommentRow key={reply.id} comment={reply} isReply />
              ))}

              {user && (
                <div className="pl-11">
                  {replyingTo === comment.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Viết phản hồi..."
                        autoFocus
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 font-sans text-[12px] outline-none focus:border-primary500"
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(comment.id)}
                        disabled={submitting || !replyText.trim()}
                        className="shrink-0 rounded-lg bg-primary500 px-3 py-1.5 font-sans text-[12px] font-semibold text-white disabled:opacity-50"
                      >
                        Gửi
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="shrink-0 font-sans text-[12px] text-gray-400 hover:text-gray-600"
                      >
                        Huỷ
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReplyingTo(comment.id)}
                      className="font-sans text-[12px] font-semibold text-primary500 hover:underline"
                    >
                      Phản hồi
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
