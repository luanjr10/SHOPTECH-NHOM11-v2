export interface EmployeeItem {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface PermissionModule {
  key: string;
  label: string;
  abilities: Array<"view" | "create" | "edit" | "delete">;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface EmployeeDetail extends EmployeeItem {
  permission_modules: PermissionModule[];
}
