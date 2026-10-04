import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { type ApiError } from "../libs/api";
import GoogleButton from "../components/auth/GoogleButton";

type FieldErrors = Record<string, string[]>;

const FIELDS = [
  { name: "name", label: "Họ tên", type: "text", placeholder: "Nguyễn Văn A" },
  {
    name: "username",
    label: "Tên đăng nhập",
    type: "text",
    placeholder: "nguyenvana",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "email@example.com",
  },
  {
    name: "password",
    label: "Mật khẩu",
    type: "password",
    placeholder: "Tối thiểu 6 ký tự",
  },
  {
    name: "password_confirmation",
    label: "Xác nhận mật khẩu",
    type: "password",
    placeholder: "Nhập lại mật khẩu",
  },
] as const;

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    setSubmitting(true);

    try {
      await register(form);
      navigate("/");
    } catch (err) {
      const apiErr = err as ApiError;
      const payload = apiErr?.payload as { errors?: FieldErrors } | undefined;
      if (payload?.errors) {
        setErrors(payload.errors);
      } else {
        setMessage(apiErr?.message ?? "Đăng ký thất bại, vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.35)]">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary500/10 text-primary500">
            <UserPlus className="size-6" />
          </div>
          <h1 className="font-sans text-[20px] font-bold text-gray-800">
            Tạo tài khoản
          </h1>
        </div>

        {message && (
          <div className="mb-4 rounded-lg bg-primary500/10 px-3 py-2 font-sans text-[13px] text-primary500">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {FIELDS.map((field) => (
            <div key={field.name}>
              <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
                {field.label}
              </label>
              <input
                type={field.type}
                required
                value={form[field.name]}
                onChange={(e) =>
                  setForm({ ...form, [field.name]: e.target.value })
                }
                placeholder={field.placeholder}
                className={`w-full rounded-lg border px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500 ${
                  errors[field.name] ? "border-primary500" : "border-gray-200"
                }`}
              />
              {errors[field.name] && (
                <p className="mt-1 font-sans text-[12px] text-primary500">
                  {errors[field.name][0]}
                </p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary500 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-60 cursor-pointer"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Đăng ký
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="font-sans text-[12px] text-gray-400">hoặc</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <GoogleButton label="Đăng ký với Google" />

        <p className="mt-4 text-center font-sans text-[13px] text-gray-500">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary500 hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
