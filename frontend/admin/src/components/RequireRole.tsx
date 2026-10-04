import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../services/auth.services";

export default function RequireRole({
  roles,
  module,
  ability = "view",
  children,
}: {
  roles: Array<"admin" | "employee" | "seller">;
  module?: string;
  ability?: "view" | "create" | "edit" | "delete";
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role as "admin" | "employee" | "seller")) {
    return <Navigate to="/" replace />;
  }

  if (module && !hasPermission(user, module, ability)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
