import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, LayoutDashboard, ShieldCheck, User, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../api/axios";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google: "Đăng nhập Google thất bại, vui lòng thử lại.",
  google_not_registered:
    "Email Google này chưa được đăng ký làm tài khoản quản trị/người bán. Liên hệ quản trị viên để được cấp tài khoản.",
  google_no_access: "Tài khoản này không có quyền truy cập trang quản lý.",
};

export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      setError(GOOGLE_ERROR_MESSAGES[errorCode] ?? "Đăng nhập thất bại, vui lòng thử lại.");
    } else if (searchParams.get("reset") === "success") {
      setInfo("Đặt lại mật khẩu thành công, vui lòng đăng nhập lại.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(loginId, password);
      if (user.role !== "admin" && user.role !== "employee" && user.role !== "seller") {
        await logout();
        setError("Tài khoản này không có quyền truy cập trang quản lý");
        return;
      }
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google?app=admin`;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 p-12 text-white md:flex">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative flex items-center gap-2 text-lg font-bold">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <LayoutDashboard className="size-5" />
          </div>
          ShopTech Dashboard
        </div>

        <div className="relative flex flex-col gap-6">
          <h1 className="text-4xl leading-tight font-bold">
            Quản trị &amp; vận hành sàn thương mại điện tử của bạn.
          </h1>
          <p className="max-w-md text-violet-100">
            Một nơi duy nhất cho quản trị viên và người bán: quản lý sản phẩm, đơn hàng, gian hàng,
            doanh thu và hơn thế nữa.
          </p>
          <div className="flex flex-col gap-3 text-sm text-violet-100">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-4.5 shrink-0" /> Bảo mật tài khoản với mã xác minh qua email
            </div>
            <div className="flex items-center gap-2.5">
              <Zap className="size-4.5 shrink-0" /> Vận hành nhanh — sản phẩm, đơn hàng, ví, gian hàng
            </div>
          </div>
        </div>

        <p className="relative text-xs text-violet-200/70">© {new Date().getFullYear()} ShopTech</p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center px-4 py-10 md:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 text-center md:items-start md:text-left">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-600 text-white md:hidden">
              <LayoutDashboard className="size-5" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Đăng nhập</h2>
            <p className="text-sm text-gray-400">Dành cho quản trị viên, người bán và nhân viên</p>
          </div>

          {info && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {info}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                Tên đăng nhập hoặc email
              </label>
              <div className="relative">
                <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  autoFocus
                  placeholder="admin"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pr-3 pl-9 text-sm text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm text-gray-600 dark:text-gray-300">Mật khẩu</label>
                <Link
                  to="/quen-mat-khau"
                  className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pr-10 pl-9 text-sm text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
            >
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            hoặc
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <GoogleIcon className="size-5 shrink-0" />
            Đăng nhập bằng Google
          </button>

          <p className="mt-6 text-center text-xs text-gray-400">
            Chỉ dành cho tài khoản quản trị viên, người bán và nhân viên đã được cấp quyền.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
