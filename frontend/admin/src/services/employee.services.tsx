import api from "../api/axios";
import type { PermissionModule } from "../types/employee.types";

export const getEmployees = async (params: { search?: string; page?: number } = {}) => {
  const res = await api.get("admin/employees", { params });
  return res.data;
};

export const getEmployeeDetail = async (id: number) => {
  const res = await api.get(`admin/employees/${id}`);
  return res.data;
};

export interface EmployeePayload {
  name: string;
  username: string;
  email: string;
  phone?: string;
}

export const createEmployee = async (payload: EmployeePayload) => {
  const res = await api.post("admin/employees", payload);
  return res.data;
};

export const updateEmployee = async (id: number, payload: EmployeePayload) => {
  const res = await api.patch(`admin/employees/${id}`, payload);
  return res.data;
};

export const deleteEmployee = async (id: number) => {
  const res = await api.delete(`admin/employees/${id}`);
  return res.data;
};

export const getPermissionModules = async (): Promise<PermissionModule[]> => {
  const res = await api.get("admin/permission-modules");
  return res.data.data;
};

export const updateEmployeePermissions = async (
  id: number,
  permissions: Array<{ module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>,
) => {
  const res = await api.put(`admin/employees/${id}/permissions`, { permissions });
  return res.data;
};
