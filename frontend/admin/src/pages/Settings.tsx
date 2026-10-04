import { useState } from "react";
import { ToastContainer } from "react-toastify";
import { Store, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AccountSettingsTab from "../components/settings/AccountSettingsTab";
import SellerSettings from "./seller/SellerSettings";

type Tab = "account" | "store";

export default function SettingsPage() {
  const { user } = useAuth();
  const isSeller = user?.role === "seller";
  const [tab, setTab] = useState<Tab>("account");

  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Cài đặt</h2>
        <p className="text-sm text-gray-400">
          {isSeller
            ? "Quản lý tài khoản cá nhân và gian hàng của bạn."
            : "Quản lý thông tin tài khoản của bạn."}
        </p>
      </div>

      {isSeller && (
        <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03]">
          <TabButton
            active={tab === "account"}
            onClick={() => setTab("account")}
            icon={UserRound}
            label="Tài khoản"
          />
          <TabButton
            active={tab === "store"}
            onClick={() => setTab("store")}
            icon={Store}
            label="Gian hàng"
          />
        </div>
      )}

      {!isSeller || tab === "account" ? <AccountSettingsTab /> : <SellerSettings />}

      <ToastContainer />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof UserRound;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-violet-600 text-white"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
