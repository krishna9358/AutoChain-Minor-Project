import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { authMiddleware, AuthRequest, JWT_SECRET } from "../middleware";
import { encrypt } from "../services/secretCrypto";
import { resolveGoogleOAuthAppForWorkspace } from "../services/googleOAuthCredentials";
import {
  buildGoogleAuthorizationUrl,
  exchangeAuthorizationCode,
  fetchGoogleUserEmail,
  isGoogleOAuthConfiguredForWorkspace,
} from "../services/googleUserOAuth";

const router = Router();

const FRONTEND_URL =
  process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface GoogleOAuthStatePayload {
  workspaceId: string;
  userId: string;
  typ: "google_oauth";
}

function signOAuthState(payload: GoogleOAuthStatePayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

function verifyOAuthState(token: string): GoogleOAuthStatePayload | null {
  try {
    const d = jwt.verify(token, JWT_SECRET) as GoogleOAuthStatePayload;
    if (d.typ !== "google_oauth" || !d.workspaceId || !d.userId) return null;
    return d;
  } catch {
    return null;
  }
}

function defaultRedirectUriHint(): string {
  const base =
    process.env.API_PUBLIC_URL?.replace(/\/$/, "") ||
    process.env.PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
    `http://localhost:${process.env.PORT || "3001"}`;
  return `${base}/api/v1/integrations/google/callback`;
}

/** Whether OAuth app credentials exist for this workspace (DB or env fallback). */
router.get("/status", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "").trim();
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId query parameter is required" });
    }
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }
    const configured = await isGoogleOAuthConfiguredForWorkspace(workspaceId);
    res.json({ configured });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Read OAuth app fields for the integrations UI (no secrets).
 * Workspace **ADMIN** can manage via PUT /app-settings.
 */
router.get("/app-settings", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "").trim();
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Access denied" });
    }
    const canManage = member.role === "ADMIN" || member.role === "EDITOR";
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        googleOAuthClientId: true,
        googleOAuthRedirectUri: true,
        googleOAuthClientSecretEnc: true,
      },
    });
    const configured = await isGoogleOAuthConfiguredForWorkspace(workspaceId);
    const resolved = await resolveGoogleOAuthAppForWorkspace(workspaceId);
    res.json({
      canManage,
      defaultRedirectUri: defaultRedirectUriHint(),
      clientId: ws?.googleOAuthClientId ?? "",
      redirectUri: ws?.googleOAuthRedirectUri ?? defaultRedirectUriHint(),
      hasClientSecret: Boolean(ws?.googleOAuthClientSecretEnc?.trim()),
      configured,
      credentialsSource: resolved?.source ?? null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** Save Google OAuth app credentials for a workspace (workspace ADMIN only). */
router.put("/app-settings", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workspaceId = String(req.body?.workspaceId || "").trim();
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member || member.role === "VIEWER") {
      return res.status(403).json({
        error: "Only workspace admins and editors can configure Google OAuth credentials",
      });
    }

    const clientId = typeof req.body?.clientId === "string" ? req.body.clientId.trim() : "";
    const redirectUri =
      typeof req.body?.redirectUri === "string"
        ? req.body.redirectUri.trim()
        : defaultRedirectUriHint();
    const clientSecret =
      typeof req.body?.clientSecret === "string" ? req.body.clientSecret.trim() : "";

    if (!clientId || !redirectUri) {
      return res.status(400).json({ error: "clientId and redirectUri are required" });
    }

    const existing = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { googleOAuthClientSecretEnc: true },
    });

    let secretEnc = existing?.googleOAuthClientSecretEnc ?? null;
    if (clientSecret) {
      secretEnc = JSON.stringify(encrypt(clientSecret));
    } else if (!secretEnc?.trim()) {
      return res.status(400).json({
        error: "clientSecret is required when no secret has been saved yet",
      });
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        googleOAuthClientId: clientId,
        googleOAuthRedirectUri: redirectUri,
        googleOAuthClientSecretEnc: secretEnc,
      },
    });

    const configured = await isGoogleOAuthConfiguredForWorkspace(workspaceId);
    res.json({ success: true, configured });
  } catch (e: any) {
    console.error("[google-oauth] app-settings PUT:", e);
    res.status(500).json({ error: e.message || "Save failed" });
  }
});

/** Clear workspace-stored OAuth app credentials (ADMIN only). Env fallback still works if set. */
router.delete("/app-settings", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "").trim();
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member || member.role === "VIEWER") {
      return res.status(403).json({ error: "Only workspace admins and editors can clear credentials" });
    }
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        googleOAuthClientId: null,
        googleOAuthClientSecretEnc: null,
        googleOAuthRedirectUri: null,
      },
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** Returns { url } — open in browser to complete Google consent. */
router.get("/authorize", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "").trim();
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId query parameter is required" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    if (!(await isGoogleOAuthConfiguredForWorkspace(workspaceId))) {
      return res.status(503).json({
        error: "Google OAuth is not configured for this workspace",
        hint:
          "Workspace admin: open Integrations → Google and save Client ID, Client secret, and Redirect URI (or set GOOGLE_OAUTH_* on the server).",
      });
    }

    const state = signOAuthState({
      typ: "google_oauth",
      workspaceId,
      userId: req.userId!,
    });

    const url = await buildGoogleAuthorizationUrl(state, workspaceId);
    res.json({ url });
  } catch (e: any) {
    console.error("[google-oauth] authorize:", e);
    res.status(500).json({ error: e.message || "Authorize failed" });
  }
});

/** Google redirects here — no JWT; validates `state` JWT. */
router.get("/callback", async (req, res) => {
  const errParam = req.query.error as string | undefined;
  const desc = (req.query.error_description as string) || "";

  const redirectError = (msg: string) => {
    const u = new URL(`${FRONTEND_URL.replace(/\/$/, "")}/dashboard/integrations/google`);
    u.searchParams.set("error", msg);
    res.redirect(u.toString());
  };

  if (errParam) {
    return redirectError(desc || errParam);
  }

  const code = String(req.query.code || "");
  const stateRaw = String(req.query.state || "");
  if (!code || !stateRaw) {
    return redirectError("missing_code_or_state");
  }

  const state = verifyOAuthState(stateRaw);
  if (!state) {
    return redirectError("invalid_state");
  }

  try {
    if (!(await isGoogleOAuthConfiguredForWorkspace(state.workspaceId))) {
      return redirectError("oauth_not_configured");
    }

    const tokens = await exchangeAuthorizationCode(code, state.workspaceId);
    if (!tokens.refresh_token) {
      return redirectError("no_refresh_token_reconnect");
    }

    const profile = await fetchGoogleUserEmail(tokens.access_token);
    const enc = encrypt(tokens.refresh_token);

    await prisma.googleOAuthConnection.create({
      data: {
        workspaceId: state.workspaceId,
        userId: state.userId,
        email: profile.email || null,
        displayName: profile.name || null,
        refreshTokenEnc: JSON.stringify(enc),
        scopes: tokens.scope || "",
      },
    });

    const ok = new URL(`${FRONTEND_URL.replace(/\/$/, "")}/dashboard/integrations/google`);
    ok.searchParams.set("success", "1");
    res.redirect(ok.toString());
  } catch (e: any) {
    console.error("[google-oauth] callback:", e);
    redirectError(encodeURIComponent(e.message || "callback_failed"));
  }
});

/** List connections for a workspace (no secrets). */
router.get("/connections", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "").trim();
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Access denied" });
    }

    const rows = await prisma.googleOAuthConnection.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        scopes: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });

    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/connections/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const conn = await prisma.googleOAuthConnection.findUnique({
      where: { id: req.params.id },
    });
    if (!conn) {
      return res.status(404).json({ error: "Connection not found" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId: conn.workspaceId },
    });
    if (!member || member.role === "VIEWER") {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.googleOAuthConnection.delete({ where: { id: conn.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export const googleOAuthRouter = router;
