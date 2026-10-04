import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../services/auth.services";

export function useModulePermission(module: string) {
  const { user } = useAuth();

  return {
    canView: hasPermission(user, module, "view"),
    canCreate: hasPermission(user, module, "create"),
    canEdit: hasPermission(user, module, "edit"),
    canDelete: hasPermission(user, module, "delete"),
  };
}
