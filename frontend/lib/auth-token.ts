"use client";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const DEV_TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN || "dev-demo-token";

/**
 * Ensure the dev token is seeded into localStorage when running in dev mode.
 * Called by the axios interceptor and by getAuthHeaders().
 */
export function ensureDevToken() {
  if (typeof window === "undefined" || !DEV_MODE) return;
  localStorage.setItem("token", DEV_TOKEN);
}

/**
 * Return the raw JWT string (no "Bearer " prefix) for use in non-axios
 * contexts (EventSource URLs, manual fetch, etc.).
 * Returns `null` when no token is available.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  ensureDevToken();
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("autochain-auth-token") ||
    null
  );
}

/**
 * Headers for raw axios/fetch calls on dashboard routes.
 * Login/signup store JWT under `token`; some older code used `autochain-auth-token`.
 */
export function getAuthHeaders(): Record<string, string> {
  const raw = getToken();
  if (!raw) return {};
  return {
    Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`,
  };
}
