import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  Camera,
  Check,
  Loader2,
  Lock,
  Mail,
  MailWarning,
  RotateCcw,
  ShieldCheck,
  Timer,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  changePassword,
  forgotPassword,
  resendVerification,
  resetPassword,
  updateProfile,
  uploadAvatar,
  verifyResetCode,
} from "../../services/profile.services";
import { notifyError, notifySuccess } from "../../helpers/notify";

type FieldErrors = Record<string, string[]>;
const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function extractErrors(err: any): FieldErrors | null {
  return err?.response?.data?.errors ?? null;
}

function extractMessage(err: any, fallback: string): string {
  return err?.response?.data?.message ?? fallback;
}

export default function AccountSettingsTab() {
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const verified = Boolean(user?.email_verified_at);

  return (
    <div className="flex flex-col gap-6">
      {searchParams.get("verified") === "1" && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Check className="size-4 shrink-0" /> Xác thực email thành công!
        </div>
      )}

      <ProfileCard
        fileRef={fileRef}
        verified={verified}
        user={user}
        updateUser={updateUser}
      />
      <SecurityCard
        verified={verified}
        hasPassword={user?.has_password !== false}
        email={user?.email ?? ""}
      />
    </div>
  );
}

function ProfileCard({ fileRef, verified, user, updateUser }: any) {
  const [form, setForm] = useState({
    name: user?.name ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      updateUser(updated);
      notifySuccess("Cập nhật hồ sơ thành công");
    } catch (err: any) {
      const fieldErrors = extractErrors(err);
      if (fieldErrors) setErrors(fieldErrors);
      notifyError(extractMessage(err, "Cập nhật hồ sơ thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadAvatar(file);
      updateUser(updated);
      notifySuccess("Cập nhật ảnh đại diện thành công");
    } catch (err: any) {
      notifyError(extractMessage(err, "Tải ảnh thất bại"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleResend = async () => {
    try {
      notifySuccess(await resendVerification());
    } catch (err: any) {
      notifyError(extractMessage(err, "Gửi lại thất bại"));
    }
  };

  const fields = [
    { name: "name", label: "Tên hiển thị", type: "text" },
    { name: "username", label: "Tên đăng nhập", type: "text" },
    { name: "phone", label: "Số điện thoại", type: "tel" },
    { name: "email", label: "Email", type: "email" },
  ] as const;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white">
        Thông tin tài khoản
      </h3>
      <p className="mb-5 text-xs text-gray-400">
        Ảnh đại diện, tên đăng nhập, liên hệ — tên đăng nhập và email phải là duy nhất.
      </p>

      {!verified && (
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <MailWarning className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                Email chưa được xác thực
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500/80">
                Xác thực email để bảo mật tài khoản và dùng được cách đổi mật khẩu qua mã email.
              </p>
            </div>
          </div>
          <button
            onClick={handleResend}
            type="button"
            className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Gửi lại email xác thực
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="size-24 rounded-full object-cover ring-4 ring-violet-500/10"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
                <User className="size-12" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-md transition-colors hover:bg-violet-500 disabled:opacity-60"
              title="Đổi ảnh đại diện"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatar}
            className="hidden"
          />
          {verified && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="size-4" /> Email đã xác thực
            </span>
          )}
          <p className="text-center text-[11px] text-gray-400">JPG, PNG, WEBP · tối đa 2MB</p>
        </div>

        <form onSubmit={handleSave} className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.name === "email" || f.name === "username" ? "" : ""}>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                {f.label}
              </label>
              <input
                type={f.type}
                inputMode={f.name === "phone" ? "numeric" : undefined}
                maxLength={f.name === "phone" ? 10 : undefined}
                value={(form as any)[f.name] ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [f.name]:
                      f.name === "phone"
                        ? e.target.value.replace(/\D/g, "").slice(0, 10)
                        : e.target.value,
                  })
                }
                placeholder={f.label}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-violet-500 dark:bg-gray-900 dark:text-gray-100 ${
                  errors[f.name]
                    ? "border-rose-400"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors[f.name] && (
                <p className="mt-1 text-xs text-rose-500">{errors[f.name][0]}</p>
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="col-span-full mt-1 flex items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-60 sm:w-auto sm:self-start sm:px-8"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Lưu thay đổi
          </button>
        </form>
      </div>
    </div>
  );
}

function SecurityCard({
  verified,
  hasPassword,
  email,
}: {
  verified: boolean;
  hasPassword: boolean;
  email: string;
}) {
  const [method, setMethod] = useState<"password" | "email">(hasPassword ? "password" : "email");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white">Bảo mật</h3>
      <p className="mb-5 text-xs text-gray-400">
        {hasPassword
          ? "Đổi mật khẩu đăng nhập."
          : "Tài khoản đang đăng nhập bằng Google, chưa có mật khẩu — đặt mật khẩu qua mã email để có thể đăng nhập trực tiếp."}
      </p>

      {hasPassword && (
        <div className="mb-5 inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setMethod("password")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              method === "password"
                ? "bg-violet-600 text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Mật khẩu hiện tại
          </button>
          <button
            type="button"
            onClick={() => verified && setMethod("email")}
            disabled={!verified}
            title={!verified ? "Cần xác thực email trước" : undefined}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              method === "email"
                ? "bg-violet-600 text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Mã xác minh qua email
          </button>
        </div>
      )}

      {method === "password" && hasPassword ? (
        <ChangeByCurrentPassword />
      ) : (
        <ChangeByEmailCode email={email} />
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
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await changePassword(form);
      notifySuccess("Đổi mật khẩu thành công");
      setForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err: any) {
      const fieldErrors = extractErrors(err);
      if (fieldErrors) setErrors(fieldErrors);
      else notifyError(extractMessage(err, "Đổi mật khẩu thất bại"));
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
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      {fields.map((f) => (
        <div key={f.name}>
          <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">{f.label}</label>
          <div className="relative">
            <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              required
              minLength={6}
              value={(form as any)[f.name]}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              className={`w-full rounded-lg border py-2.5 pr-3 pl-9 text-sm outline-none focus:border-violet-500 dark:bg-gray-900 dark:text-gray-100 ${
                errors[f.name] ? "border-rose-400" : "border-gray-200 dark:border-gray-700"
              }`}
            />
          </div>
          {errors[f.name] && <p className="mt-1 text-xs text-rose-500">{errors[f.name][0]}</p>}
        </div>
      ))}
      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        Đổi mật khẩu
      </button>
    </form>
  );
}

function ChangeByEmailCode({ email }: { email: string }) {
  const [step, setStep] = useState<"start" | "code" | "password">("start");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [passwords, setPasswords] = useState({ password: "", password_confirmation: "" });
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      if (isResend) notifySuccess("Đã gửi lại mã mới, vui lòng kiểm tra email.");
      setTimeout(() => inputsRef.current[0]?.focus(), 60);
    } catch (err: any) {
      setError(extractMessage(err, "Có lỗi xảy ra, vui lòng thử lại"));
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
      setError(extractMessage(err, "Mã xác minh không đúng"));
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
      await resetPassword({ email, code, ...passwords });
      notifySuccess("Đổi mật khẩu thành công. Vui lòng đăng nhập lại nếu bị đăng xuất.");
      setStep("start");
      setPasswords({ password: "", password_confirmation: "" });
    } catch (err: any) {
      const fieldErrors = extractErrors(err);
      const first = fieldErrors ? Object.values(fieldErrors)[0]?.[0] : undefined;
      setError(first ?? extractMessage(err, "Đổi mật khẩu thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex max-w-sm flex-col gap-4">
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}

      {step === "start" && (
        <>
          <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Mail className="size-4 shrink-0 text-violet-500" />
            Gửi mã 6 số tới <span className="font-semibold">{email}</span>
          </p>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
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
                className={`size-11 rounded-lg border-2 text-center text-lg font-bold outline-none transition-all focus:border-violet-500 disabled:opacity-60 dark:bg-gray-900 dark:text-gray-100 ${
                  digit ? "border-violet-500 bg-violet-500/5" : "border-gray-200 dark:border-gray-700"
                }`}
              />
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 text-xs">
            {loading ? (
              <span className="flex items-center gap-1.5 text-gray-500">
                <Loader2 className="size-4 animate-spin" /> Đang xác minh…
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <Timer className="size-3.5 text-violet-500" />
                  Mã có hiệu lực trong ít phút
                </span>
                {resendIn > 0 ? (
                  <span className="text-gray-400">Gửi lại mã sau {resendIn}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendCode(true)}
                    className="flex items-center gap-1.5 font-semibold text-violet-600 hover:underline dark:text-violet-400"
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
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <ShieldCheck className="size-4" /> Mã hợp lệ, hãy đặt mật khẩu mới
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">Mật khẩu mới</label>
            <input
              type="password"
              required
              minLength={6}
              value={passwords.password}
              onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Đổi mật khẩu
          </button>
        </form>
      )}
    </div>
  );
}
