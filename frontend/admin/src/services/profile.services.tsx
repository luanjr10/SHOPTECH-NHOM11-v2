import api from "../api/axios";
import type { AuthUser } from "./auth.services";

export interface UpdateProfilePayload {
  name: string;
  username: string;
  email: string;
  phone?: string | null;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const res = await api.patch("/profile", payload);
  return res.data.data as AuthUser;
}

export async function uploadAvatar(file: File): Promise<AuthUser> {
  const form = new FormData();
  form.append("avatar", file);
  const res = await api.post("/profile/avatar", form);
  return res.data.data as AuthUser;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<string> {
  const res = await api.post("/change-password", payload);
  return res.data.message as string;
}

export async function resendVerification(): Promise<string> {
  const res = await api.post("/email/verification-notification");
  return res.data.message as string;
}

export async function forgotPassword(email: string): Promise<number> {
  const res = await api.post("/forgot-password", { email });
  return res.data.ttl ?? 60;
}

export async function verifyResetCode(email: string, code: string): Promise<void> {
  await api.post("/verify-reset-code", { email, code });
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<string> {
  const res = await api.post("/reset-password", payload);
  return res.data.message as string;
}
