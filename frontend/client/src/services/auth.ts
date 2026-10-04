import { apiAuthGet, apiPost } from "../libs/api";
import { type AuthUser } from "../types/auth";

interface AuthResponse {
  success: boolean;
  message: string;
  data: AuthUser;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginPayload {
  login: string;
  password: string;
  remember?: boolean;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  const res = await apiPost<AuthResponse>("/register", payload);
  return res.data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthUser> {
  const res = await apiPost<AuthResponse>("/login", payload);
  return res.data;
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await apiAuthGet<AuthResponse>("/me");
    return res.data;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await apiPost("/logout");
}

export async function forgotPassword(email: string): Promise<number> {
  const res = await apiPost<{ message: string; ttl?: number }>(
    "/forgot-password",
    { email },
  );
  return res.ttl ?? 60;
}

export async function verifyResetCode(
  email: string,
  code: string,
): Promise<void> {
  await apiPost("/verify-reset-code", { email, code });
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<string> {
  const res = await apiPost<{ message: string }>("/reset-password", payload);
  return res.message;
}
