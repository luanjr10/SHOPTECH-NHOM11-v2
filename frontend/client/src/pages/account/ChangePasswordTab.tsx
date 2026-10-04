import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  LockKeyhole,
  Mail,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { changePassword } from "../../services/account";
import { forgotPassword, resetPassword, verifyResetCode } from "../../services/auth";
import { type ApiError } from "../../libs/api";

type FieldErrors = Record<string, string[]>;
const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function ChangePasswordTab() {
  const { user } = useAuth();
  const hasPassword = user?.has_password !== false;
  const [method, setMethod] = useState<"password" | "email">(hasPassword ? "password" : "email");

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
      <h2 className="mb-1 font-sans text-[18px] font-bold text-gray-800">
        {hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}
      </h2>
      <p className="mb-5 font-sans text-[13px] text-gray-500">
        {hasPassword
          ? "Sau khi đổi, các thiết bị khác sẽ bị đăng xuất để đảm bảo an toàn"
          : "Tài khoản của bạn đang đăng nhập bằng Google, chưa có mật khẩu riêng."}
      </p>

      {!hasPassword && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-blue-500" />
          <p className="font-sans text-[13px] text-blue-700">
            Đặt mật khẩu để có thể đăng nhập bằng username/email + mật khẩu, không cần qua Google
            nữa. Chúng tôi sẽ gửi mã xác minh về email đã liên kết để đảm bảo đúng là bạn.
          </p>
        </div>
      )}

      {hasPassword && (
        <div className="mb-5 inline-flex rounded-lg border border-gray-200 p-1">
          <button
            type="button"
            onClick={() => setMethod("password")}
            className={`cursor-pointer rounded-md px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
              method === "password"
                ? "bg-primary500 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Mật khẩu hiện tại
          </button>
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`cursor-pointer rounded-md px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
              method === "email" ? "bg-primary500 text-white" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Mã xác minh qua email
          </button>
        </div>
      )}

      {method === "password" && hasPassword ? (
        <ChangeByCurrentPassword />
      ) : (
        <ChangeByEmailCode email={user?.email ?? ""} />
      )}
    </div>
  );
}

function ChangeByCurrentPassword() {
  const [form, setForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    setSaving(true);
    try {
      const msg = await changePassword(form);
      setMessage(msg);
      setForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err) {
      const apiErr = err as ApiError;
      const payload = apiErr?.payload as { errors?: FieldErrors } | undefined;
      if (payload?.errors) setErrors(payload.errors);
      else setMessage(apiErr?.message ?? "Đổi mật khẩu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { name: "current_password", label: "Mật khẩu hiện tại" },
    { name: "password", label: "Mật khẩu mới" },
    { name: "password_confirmation", label: "Xác nhận mật khẩu mới" },
  ] as const;

  return (
    <>
      {message && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 font-sans text-[13px] text-green-700">
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
              {f.label}
            </label>
            <div className="relative">
              <LockKeyhole className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={form[f.name]}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                placeholder={f.label}
                className={`w-full rounded-lg border py-2.5 pr-3 pl-9 font-sans text-[14px] outline-none focus:border-primary500 ${
                  errors[f.name] ? "border-primary500" : "border-gray-200"
                }`}
              />
            </div>
            {errors[f.name] && (
              <p className="mt-1 font-sans text-[12px] text-primary500">{errors[f.name][0]}</p>
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-primary500 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-60 cursor-pointer sm:self-start sm:px-8"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Đổi mật khẩu
        </button>
      </form>
    </>
  );
}

function ChangeByEmailCode({ email }: { email: string }) {
  const [step, setStep] = useState<"start" | "code" | "password">("start");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [passwords, setPasswords] = useState({ password: "", password_confirmation: "" });
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join("");
  const codeComplete = code.length === CODE_LENGTH;

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
    setLoading(true);
    try {
      await forgotPassword(email);
      setDigits(Array(CODE_LENGTH).fill(""));
      setStep("code");
      setResendIn(RESEND_COOLDOWN);
      if (isResend) setMessage("Đã gửi lại mã mới, vui lòng kiểm tra email.");
      setTimeout(() => inputsRef.current[0]?.focus(), 60);
    } catch (err) {
      setError((err as ApiError)?.message ?? "Có lỗi xảy ra, vui lòng thử lại");
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
    } catch (err) {
      setError((err as ApiError)?.message ?? "Mã xác minh không đúng");
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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const msg = await resetPassword({ email, code, ...passwords });
      setMessage(msg || "Đặt mật khẩu thành công.");
      setStep("start");
      setPasswords({ password: "", password_confirmation: "" });
    } catch (err) {
      const apiErr = err as ApiError;
      const payload = apiErr?.payload as { errors?: FieldErrors } | undefined;
      const first = payload?.errors ? Object.values(payload.errors)[0]?.[0] : undefined;
      setError(first ?? apiErr?.message ?? "Đặt mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex max-w-sm flex-col gap-4">
      {message && (
        <p className="rounded-lg bg-green-50 px-3 py-2 font-sans text-[13px] text-green-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-primary500/10 px-3 py-2 font-sans text-[13px] text-primary500">
          {error}
        </p>
      )}

      {step === "start" && (
        <>
          <p className="flex items-center gap-2 font-sans text-[13px] text-gray-600">
            <Mail className="size-4 shrink-0 text-primary500" />
            Gửi mã 6 số tới <span className="font-semibold">{email}</span>
          </p>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary500 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-60 cursor-pointer"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Gửi mã xác minh
          </button>
        </>
      )}

      {step === "code" && (
        <>
          <div className="flex justify-center gap-2">
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
                className={`size-11 rounded-lg border-2 text-center font-sans text-[18px] font-bold outline-none transition-all focus:border-primary500 disabled:opacity-60 ${
                  digit ? "border-primary500 bg-primary500/5" : "border-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 font-sans text-[12px]">
            {loading ? (
              <span className="flex items-center gap-1.5 text-gray-500">
                <Loader2 className="size-4 animate-spin" /> Đang xác minh…
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-500">
                  <Timer className="size-3.5 text-primary500" />
                  Mã có hiệu lực trong ít phút
                </span>
                {resendIn > 0 ? (
                  <span className="text-gray-400">Gửi lại mã sau {resendIn}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendCode(true)}
                    className="flex items-center gap-1.5 font-semibold text-primary500 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" /> Gửi lại mã
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {step === "password" && (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-green-50 py-2 font-sans text-[13px] font-medium text-green-700">
            <ShieldCheck className="size-4" /> Mã hợp lệ, hãy đặt mật khẩu mới
          </div>
          <div>
            <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
              Mật khẩu mới
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={passwords.password}
              onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500"
            />
          </div>
          <div>
            <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={passwords.password_confirmation}
              onChange={(e) =>
                setPasswords({ ...passwords, password_confirmation: e.target.value })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary500 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-60 cursor-pointer"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Đặt mật khẩu
          </button>
        </form>
      )}
    </div>
  );
}

export default ChangePasswordTab;
