import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Loader2,
  LockKeyhole,
  Mail,
  RotateCcw,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { forgotPassword, resetPassword, verifyResetCode } from "../services/profile.services";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;
type Step = "email" | "code" | "password";
const STEPS: { key: Step; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "code", label: "Xác minh" },
  { key: "password", label: "Mật khẩu" },
];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [passwords, setPasswords] = useState({ password: "", password_confirmation: "" });
  const [resendIn, setResendIn] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join("");
  const codeComplete = code.length === CODE_LENGTH;
  const activeIndex = STEPS.findIndex((s) => s.key === step);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code" && codeComplete && !loading) {
      verifyCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  const sendCode = async (isResend = false) => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setDigits(Array(CODE_LENGTH).fill(""));
      setStep("code");
      setResendIn(RESEND_COOLDOWN);
      if (isResend) setInfo("Đã gửi lại mã mới, vui lòng kiểm tra email.");
      setTimeout(() => inputsRef.current[0]?.focus(), 60);
    } catch (err: any) {
      setError(
        err?.response?.status === 429
          ? "Bạn thao tác quá nhanh, vui lòng chờ một chút rồi thử lại."
          : (err?.response?.data?.message ?? "Có lỗi xảy ra, vui lòng thử lại"),
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (fullCode: string) => {
    setError(null);
    setLoading(true);
    try {
      await verifyResetCode(email, fullCode);
      setStep("password");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Mã xác minh không đúng");
      setDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputsRef.current[0]?.focus(), 60);
    } finally {
      setLoading(false);
    }
  };

  const setDigit = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (char && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const next = text.slice(0, CODE_LENGTH).split("");
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => next[i] ?? ""));
    inputsRef.current[Math.min(next.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ email, code, ...passwords });
      navigate("/login?reset=success");
    } catch (err: any) {
      const fieldErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      const firstFieldError = fieldErrors ? Object.values(fieldErrors)[0]?.[0] : undefined;
      setError(firstFieldError ?? err?.response?.data?.message ?? "Đặt lại mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_10px_40px_-12px_rgba(0,0,0,0.15)] dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-violet-600 to-violet-500 px-6 pt-8 pb-14 text-center text-white">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              {step === "email" && <Mail className="size-7" />}
              {step === "code" && <ShieldCheck className="size-7" />}
              {step === "password" && <LockKeyhole className="size-7" />}
            </div>
            <h1 className="text-[22px] leading-tight font-bold">
              {step === "email" && "Quên mật khẩu"}
              {step === "code" && "Nhập mã xác minh"}
              {step === "password" && "Tạo mật khẩu mới"}
            </h1>
            <p className="max-w-xs text-[13px] text-white/80">
              {step === "email" && "Nhập email đã đăng ký, chúng tôi sẽ gửi mã gồm 6 số"}
              {step === "code" && (
                <>
                  Mã đã gửi tới <span className="font-semibold text-white">{email}</span>
                </>
              )}
              {step === "password" && "Đặt mật khẩu mới cho tài khoản của bạn"}
            </p>
          </div>

          <div className="px-6 pb-6">
            <div className="-mt-7 mb-6 flex items-center justify-center gap-2">
              {STEPS.map((s, i) => {
                const done = i < activeIndex;
                const current = i === activeIndex;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`flex size-9 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-colors ${
                          done
                            ? "border-violet-600 bg-violet-600 text-white"
                            : current
                              ? "border-violet-600 bg-white text-violet-600 dark:bg-gray-900"
                              : "border-gray-200 bg-white text-gray-300 dark:border-gray-700 dark:bg-gray-900"
                        }`}
                      >
                        {done ? <Check className="size-4" /> : i + 1}
                      </div>
                      <span
                        className={`text-[11px] ${
                          current || done ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`mb-4 h-0.5 w-8 rounded ${
                          done ? "bg-violet-600" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {info && (
              <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-[13px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                {info}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-center text-[13px] text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                {error}
              </div>
            )}

            {step === "email" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendCode();
                }}
                className="flex flex-col gap-4"
              >
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ban@shoptech.vn"
                      className="w-full rounded-xl border border-gray-200 py-3 pr-3 pl-9 text-[14px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Gửi mã xác minh
                </button>
              </form>
            )}

            {step === "code" && (
              <div className="flex flex-col gap-5">
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputsRef.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      disabled={loading}
                      value={digit}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={`size-12 rounded-xl border-2 text-center text-[22px] font-bold outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-100 sm:size-13 ${
                        digit ? "border-violet-500 bg-violet-500/5" : "border-gray-200 dark:border-gray-700"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex flex-col items-center gap-2 text-[13px]">
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Loader2 className="size-4 animate-spin" /> Đang xác minh…
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        <Timer className="size-4 text-violet-500" />
                        Mã có hiệu lực trong ít phút
                      </span>
                      {resendIn > 0 ? (
                        <span className="text-gray-400">
                          Gửi lại mã sau <span className="font-semibold text-violet-600">{resendIn}s</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => sendCode(true)}
                          className="flex items-center gap-1.5 font-semibold text-violet-600 hover:underline dark:text-violet-400"
                        >
                          <RotateCcw className="size-4" /> Gửi lại mã
                        </button>
                      )}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                  }}
                  className="mx-auto flex items-center gap-1 text-[13px] text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400"
                >
                  <ArrowLeft className="size-4" /> Đổi email khác
                </button>
              </div>
            )}

            {step === "password" && (
              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-[13px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Check className="size-4" /> Mã hợp lệ, hãy đặt mật khẩu mới
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwords.password}
                      onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full rounded-xl border border-gray-200 py-3 pr-3 pl-9 text-[14px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwords.password_confirmation}
                      onChange={(e) =>
                        setPasswords({ ...passwords, password_confirmation: e.target.value })
                      }
                      placeholder="Nhập lại mật khẩu"
                      className="w-full rounded-xl border border-gray-200 py-3 pr-3 pl-9 text-[14px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Đặt lại mật khẩu
                </button>
              </form>
            )}

            <p className="mt-5 text-center text-[13px] text-gray-500 dark:text-gray-400">
              <Link to="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
                ← Quay lại đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
