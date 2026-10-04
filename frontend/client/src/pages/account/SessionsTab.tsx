import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, MonitorSmartphone, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { logoutOtherDevices } from "../../services/account";
import { type ApiError } from "../../libs/api";

function SessionsTab() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [message, setMessage] = useState<string | null>(null);
  const [loadingOthers, setLoadingOthers] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutOthers = async () => {
    setMessage(null);
    setLoadingOthers(true);
    try {
      setMessage(await logoutOtherDevices());
    } catch (err) {
      setMessage((err as ApiError)?.message ?? "Thao tác thất bại");
    } finally {
      setLoadingOthers(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate("/");
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
      <h2 className="mb-1 font-sans text-[18px] font-bold text-gray-800">
        Phiên đăng nhập
      </h2>
      <p className="mb-5 font-sans text-[13px] text-gray-500">
        Quản lý các phiên đăng nhập trên thiết bị của bạn
      </p>

      {message && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 font-sans text-[13px] text-green-700">
          {message}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary500/10 text-primary500">
              <MonitorSmartphone className="size-5" />
            </div>
            <div>
              <p className="font-sans text-[14px] font-semibold text-gray-800">
                Thiết bị này
              </p>
              <p className="font-sans text-[12px] text-gray-400">
                Phiên đang hoạt động
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 font-sans text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 cursor-pointer"
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Đăng xuất
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-sans text-[14px] font-semibold text-amber-800">
                Đăng xuất tất cả thiết bị khác
              </p>
              <p className="font-sans text-[12px] text-amber-700">
                Hữu ích khi bạn nghi ngờ tài khoản bị đăng nhập ở nơi khác.
              </p>
            </div>
          </div>
          <button
            onClick={handleLogoutOthers}
            disabled={loadingOthers}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60 cursor-pointer"
          >
            {loadingOthers && <Loader2 className="size-4 animate-spin" />}
            Đăng xuất thiết bị khác
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionsTab;
