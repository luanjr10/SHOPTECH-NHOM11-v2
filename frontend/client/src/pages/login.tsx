import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { type ApiError } from "../libs/api";
import GoogleButton from "../components/auth/GoogleButton";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "google"
      ? "Đăng nhập Google thất bại, vui lòng thử lại"
      : null,
  );
  const [notice] = useState<string | null>(
    searchParams.get("reset") === "success"
      ? "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setError(
        (err as ApiError)?.message ?? "Đăng nhập thất bại, vui lòng thử lại",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.35)]">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary500/10 text-primary500">
            <LockKeyhole className="size-6" />
          </div>
          <h1 className="font-sans text-[20px] font-bold text-gray-800">
            Đăng nhập
          </h1>
          <p className="font-sans text-[13px] text-gray-500">
            Đăng nhập để mua hàng và mở gian hàng của bạn
          </p>
        </div>

        {notice && (
          <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 font-sans text-[13px] text-green-700">
            {notice}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-primary500/10 px-3 py-2 font-sans text-[13px] text-primary500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
              Tên đăng nhập hoặc Email
            </label>
            <input
              type="text"
              required
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="username hoặc email@example.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block font-sans text-[13px] font-medium text-gray-700">
                Mật khẩu
              </label>
              <Link
                to="/forgot-password"
                className="font-sans text-[12px] font-medium text-primary500 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-primary500 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-60 cursor-pointer"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Đăng nhập
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="font-sans text-[12px] text-gray-400">hoặc</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <GoogleButton />

        <p className="mt-4 text-center font-sans text-[13px] text-gray-500">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="font-semibold text-primary500 hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
