export const API_ORIGIN =
  (import.meta.env.VITE_API_ORIGIN as string | undefined) ??
  (import.meta.env.PROD ? "" : "http://localhost:8000");

export const ADMIN_URL =
  (import.meta.env.VITE_ADMIN_URL as string | undefined) ??
  "http://localhost:5173";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? `${API_ORIGIN}/api`;

type QueryValue = string | number | boolean | undefined | null;

export interface ApiError extends Error {
  status: number;
  payload: unknown;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, QueryValue>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}): ${path}`);
  }

  return response.json() as Promise<T>;
}

const NO_REFRESH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/refresh",
  "/logout",
];

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/refresh`, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function authRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  isRetry = false,
): Promise<T> {
  // JWT nằm trong cookie HttpOnly (SameSite=Lax) nên chỉ cần gửi kèm cookie, không cần CSRF token.
  const isForm = body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined && !isForm) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body:
      body === undefined
        ? undefined
        : isForm
          ? (body as FormData)
          : JSON.stringify(body),
  });

  if (
    response.status === 401 &&
    !isRetry &&
    !NO_REFRESH_PATHS.includes(path) &&
    (await tryRefresh())
  ) {
    return authRequest<T>(method, path, body, true);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      (data as { message?: string })?.message ?? `API ${response.status}`,
    ) as ApiError;
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data as T;
}

export const apiAuthGet = <T>(path: string): Promise<T> =>
  authRequest<T>("GET", path);

export const apiPost = <T>(path: string, body?: unknown): Promise<T> =>
  authRequest<T>("POST", path, body);

export const apiPatch = <T>(path: string, body?: unknown): Promise<T> =>
  authRequest<T>("PATCH", path, body);

export const apiPut = <T>(path: string, body?: unknown): Promise<T> =>
  authRequest<T>("PUT", path, body);

export const apiDelete = <T>(path: string): Promise<T> =>
  authRequest<T>("DELETE", path);

export const apiUpload = <T>(path: string, form: FormData): Promise<T> =>
  authRequest<T>("POST", path, form);
