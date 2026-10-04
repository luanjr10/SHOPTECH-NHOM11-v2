import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  Camera,
  CircleUserRound,
  Loader2,
  MailWarning,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  resendVerification,
  updateProfile,
  uploadAvatar,
} from "../../services/account";
import { type ApiError } from "../../libs/api";

type FieldErrors = Record<string, string[]>;

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(
    searchParams.get("verified") === "1"
      ? "Xác thực email thành công!"
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const verified = Boolean(user?.email_verified_at);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      updateUser(updated);
      setMessage("Cập nhật hồ sơ thành công");
    } catch (err) {
      const apiErr = err as ApiError;
      const payload = apiErr?.payload as { errors?: FieldErrors } | undefined;
      if (payload?.errors) setErrors(payload.errors);
      else setMessage(apiErr?.message ?? "Cập nhật thất bại");
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
    } catch (err) {
      setMessage((err as ApiError)?.message ?? "Tải ảnh thất bại");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleResend = async () => {
    setResendMsg(null);
    try {
      setResendMsg(await resendVerification());
    } catch (err) {
      setResendMsg((err as ApiError)?.message ?? "Gửi lại thất bại");
    }
  };

  const fields = [
    { name: "name", label: "Tên hiển thị", type: "text" },
    { name: "username", label: "Tên đăng nhập", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Số điện thoại", type: "tel" },
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="mb-1 font-sans text-[18px] font-bold text-gray-800">
          Hồ sơ của tôi
        </h2>
        <p className="mb-5 font-sans text-[13px] text-gray-500">
          Quản lý thông tin để bảo mật tài khoản
        </p>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 font-sans text-[13px] text-green-700">
            {message}
          </div>
        )}

        {!verified && (
          <div className="mb-5 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <MailWarning className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-sans text-[13px] font-semibold text-amber-800">
                  Email chưa được xác thực
                </p>
                <p className="font-sans text-[12px] text-amber-700">
                  {resendMsg ?? "Xác thực email để bảo vệ tài khoản của bạn."}
                </p>
              </div>
            </div>
            <button
              onClick={handleResend}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-amber-600 cursor-pointer"
            >
              Gửi lại email
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
                  className="size-28 rounded-full object-cover ring-4 ring-primary500/10"
                />
              ) : (
                <div className="flex size-28 items-center justify-center rounded-full bg-primary500/10 text-primary500">
                  <CircleUserRound className="size-16" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-primary500 text-white shadow-md transition-colors hover:bg-primary300 disabled:opacity-60 cursor-pointer"
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
              <span className="flex items-center gap-1 font-sans text-[12px] font-medium text-green-600">
                <BadgeCheck className="size-4" /> Đã xác thực
              </span>
            )}
            <p className="text-center font-sans text-[11px] text-gray-400">
              JPG, PNG, WEBP · tối đa 2MB
            </p>
          </div>

          <form onSubmit={handleSave} className="flex flex-1 flex-col gap-4">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  inputMode={f.name === "phone" ? "numeric" : undefined}
                  maxLength={f.name === "phone" ? 10 : undefined}
                  value={form[f.name] ?? ""}
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
                  className={`w-full rounded-lg border px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500 ${
                    errors[f.name] ? "border-primary500" : "border-gray-200"
                  }`}
                />
                {errors[f.name] && (
                  <p className="mt-1 font-sans text-[12px] text-primary500">
                    {errors[f.name][0]}
                  </p>
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={saving}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-primary500 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-60 cursor-pointer sm:w-auto sm:px-8 sm:self-start"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Lưu thay đổi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfileTab;
