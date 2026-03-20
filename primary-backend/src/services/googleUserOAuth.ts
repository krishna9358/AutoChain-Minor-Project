/**
 * Google OAuth2 (user consent) for Calendar / Docs / Sheets — token exchange + refresh.
 * Credentials come from **workspace settings** (dashboard form) or env:
 * GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI.
 */

import type { ResolvedGoogleOAuthApp } from "./googleOAuthCredentials";
import { resolveGoogleOAuthAppForWorkspace } from "./googleOAuthCredentials";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";

/** Scopes for all Google workflow nodes (Calendar includes Meet via conferenceData). */
export const GOOGLE_WORKFLOW_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "openid",
  "email",
  "profile",
].join(" ");

export async function isGoogleOAuthConfiguredForWorkspace(workspaceId: string): Promise<boolean> {
  const app = await resolveGoogleOAuthAppForWorkspace(workspaceId);
  return app !== null;
}

async function requireApp(workspaceId: string): Promise<ResolvedGoogleOAuthApp> {
  const app = await resolveGoogleOAuthAppForWorkspace(workspaceId);
  if (!app) {
    throw new Error(
      "Google OAuth is not configured for this workspace — add Client ID, Client secret, and Redirect URI in Integrations (workspace admin) or set GOOGLE_OAUTH_* env vars on the server.",
    );
  }
  return app;
}

/** URL to send the user’s browser to (after your API returns this to the SPA). */
export async function buildGoogleAuthorizationUrl(state: string, workspaceId: string): Promise<string> {
  const app = await requireApp(workspaceId);
  const params = new URLSearchParams({
    client_id: app.clientId,
    redirect_uri: app.redirectUri,
    response_type: "code",
    scope: GOOGLE_WORKFLOW_OAUTH_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(
  code: string,
  workspaceId: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}> {
  const app = await requireApp(workspaceId);
  const body = new URLSearchParams({
    code,
    client_id: app.clientId,
    client_secret: app.clientSecret,
    redirect_uri: app.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || typeof data.access_token !== "string") {
    const err = data.error_description || data.error || res.statusText;
    throw new Error(`Google code exchange failed: ${String(err)}`);
  }
  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

export async function refreshGoogleUserAccessToken(
  refreshToken: string,
  workspaceId: string,
): Promise<string> {
  const app = await requireApp(workspaceId);
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: app.clientId,
    client_secret: app.clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || typeof data.access_token !== "string") {
    const err = data.error_description || data.error || res.statusText;
    throw new Error(`Google refresh token failed: ${String(err)}`);
  }
  return data.access_token as string;
}

export async function fetchGoogleUserEmail(
  accessToken: string,
): Promise<{ email?: string; name?: string }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  const u = (await res.json()) as { email?: string; name?: string };
  return { email: u.email, name: u.name };
}
