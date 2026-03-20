"use client";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const DEV_TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN || "dev-demo-token";

function ensureDevTokenLocal() {
  if (typeof window === "undefined" || !DEV_MODE) return;
  localStorage.setItem("token", DEV_TOKEN);
}

/**
 * Headers for raw axios/fetch calls on dashboard routes.
 * Login/signup store JWT under `token`; some older code used `autochain-auth-token`.
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  ensureDevTokenLocal();
  const raw =
    localStorage.getItem("token") ||
    localStorage.getItem("autochain-auth-token");
  if (!raw) return {};
  return {
    Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`,
  };
}
