"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  KeyRound,
} from "lucide-react";
import { BACKEND_URL } from "@/app/config";
import { getAuthHeaders } from "@/lib/auth-token";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

type GoogleConn = {
  id: string;
  email: string | null;
  displayName: string | null;
  scopes: string;
  createdAt: string;
  userId: string;
};

type CredentialsSource = "workspace" | "env" | null;

export default function GoogleIntegrationsPage() {
  const router = useRouter();
  const { activeWorkspace, loading: wsLoading } = useWorkspace();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [credentialsSource, setCredentialsSource] = useState<CredentialsSource>(null);
  const [canManageApp, setCanManageApp] = useState(false);
  const [defaultRedirectUri, setDefaultRedirectUri] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formClientSecret, setFormClientSecret] = useState("");
  const [formRedirectUri, setFormRedirectUri] = useState("");
  const [hasClientSecret, setHasClientSecret] = useState(false);
  const [savingApp, setSavingApp] = useState(false);

  const [connections, setConnections] = useState<GoogleConn[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const wsId = activeWorkspace?.id ?? "";

  const refresh = useCallback(async () => {
    if (!wsId) {
      setConnections([]);
      setConfigured(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const s = await fetch(
        `${BACKEND_URL}/api/v1/integrations/google/app-settings?workspaceId=${encodeURIComponent(wsId)}`,
        { headers },
      );
      const sJson = (await s.json().catch(() => ({}))) as {
        error?: string;
        configured?: boolean;
        canManage?: boolean;
        defaultRedirectUri?: string;
        clientId?: string;
        redirectUri?: string;
        hasClientSecret?: boolean;
        credentialsSource?: CredentialsSource;
      };
      if (!s.ok) {
        throw new Error(typeof sJson.error === "string" ? sJson.error : "Failed to load settings");
      }
      setConfigured(!!sJson.configured);
      setCanManageApp(!!sJson.canManage);
      setDefaultRedirectUri(sJson.defaultRedirectUri || `${BACKEND_URL.replace(/\/$/, "")}/api/v1/integrations/google/callback`);
      setFormClientId(sJson.clientId || "");
      setFormRedirectUri(sJson.redirectUri || sJson.defaultRedirectUri || "");
      setHasClientSecret(!!sJson.hasClientSecret);
      setCredentialsSource(sJson.credentialsSource ?? null);
      setFormClientSecret("");

      const r = await fetch(
        `${BACKEND_URL}/api/v1/integrations/google/connections?workspaceId=${encodeURIComponent(wsId)}`,
        { headers },
      );
      const body = await r.json().catch(() => []);
      if (!r.ok) throw new Error(typeof body.error === "string" ? body.error : "Failed to list connections");
      setConnections(Array.isArray(body) ? body : []);
    } catch (e: unknown) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Load failed" });
    } finally {
      setLoading(false);
    }
  }, [wsId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const ok = p.get("success");
    const err = p.get("error");
    if (ok === "1") {
      setBanner({ type: "ok", text: "Google account connected." });
      router.replace("/dashboard/integrations/google");
    } else if (err) {
      setBanner({
        type: "err",
        text: decodeURIComponent(err).replace(/\+/g, " ") || "Connection failed",
      });
      router.replace("/dashboard/integrations/google");
    }
  }, [router]);

  const saveAppSettings = async () => {
    if (!wsId || !canManageApp) return;
    setSavingApp(true);
    setBanner(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/integrations/google/app-settings`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: wsId,
          clientId: formClientId.trim(),
          clientSecret: formClientSecret.trim(),
          redirectUri: formRedirectUri.trim() || defaultRedirectUri,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      setBanner({ type: "ok", text: "Google OAuth app settings saved for this workspace." });
      await refresh();
    } catch (e: unknown) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSavingApp(false);
    }
  };

  const clearWorkspaceCredentials = async () => {
    if (!wsId || !canManageApp) return;
    if (!confirm("Remove workspace-stored Google OAuth credentials? Environment-based configuration (if any) will still apply.")) {
      return;
    }
    try {
      const r = await fetch(
        `${BACKEND_URL}/api/v1/integrations/google/app-settings?workspaceId=${encodeURIComponent(wsId)}`,
        { method: "DELETE", headers: getAuthHeaders() },
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Clear failed");
      setBanner({ type: "ok", text: "Workspace OAuth app credentials cleared." });
      await refresh();
    } catch (e: unknown) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Clear failed" });
    }
  };

  const startConnect = async () => {
    if (!wsId) return;
    setConnecting(true);
    setBanner(null);
    try {
      const r = await fetch(
        `${BACKEND_URL}/api/v1/integrations/google/authorize?workspaceId=${encodeURIComponent(wsId)}`,
        { headers: getAuthHeaders() },
      );
      const data = (await r.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        url?: string;
      };
      if (!r.ok) {
        const msg = typeof data.error === "string" ? data.error : "Could not start OAuth";
        const hint = typeof data.hint === "string" ? data.hint : "";
        throw new Error(hint ? `${msg} — ${hint}` : msg);
      }
      const url = data.url;
      if (!url) throw new Error("No authorize URL returned");
      window.location.href = url;
    } catch (e: unknown) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "OAuth start failed" });
      setConnecting(false);
    }
  };

  const removeConn = async (id: string) => {
    if (!confirm("Remove this Google connection? Workflows using it will stop working until you reconnect.")) return;
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/integrations/google/connections/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Delete failed");
      await refresh();
      setBanner({ type: "ok", text: "Connection removed." });
    } catch (e: unknown) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Delete failed" });
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 border border-white/10 bg-black/20 text-[var(--text-primary)]";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div
          className="p-2.5 rounded-xl border"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <Cloud className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Google (Calendar, Meet, Docs, Sheets)
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            <strong>Workspace admins and editors</strong> paste your Google Cloud OAuth client here (no server .env
            needed). Viewers can connect their Google account once this is set up.
          </p>
        </div>
      </div>

      {banner && (
        <div
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border"
          style={{
            borderColor: banner.type === "ok" ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
            background: banner.type === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            color: banner.type === "ok" ? "#34d399" : "#f87171",
          }}
        >
          {banner.type === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {banner.text}
        </div>
      )}

      {wsLoading ? (
        <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Loading workspace…
        </p>
      ) : !wsId ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Join or create a workspace first, then return here to connect Google.
        </p>
      ) : (
        <>
          {/* OAuth app configuration (workspace admin) */}
          {canManageApp && (
            <div
              className="rounded-xl border p-4 space-y-4"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Google OAuth client (this workspace)
                </h2>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                In{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 underline"
                >
                  Google Cloud Console → APIs & Services → Credentials
                </a>
                , create an <strong>OAuth 2.0 Client ID</strong> (Web application). Add this{" "}
                <strong>Authorized redirect URI</strong> (must match exactly):
              </p>
              <code
                className="block text-[11px] p-2 rounded-lg break-all"
                style={{ background: "rgba(0,0,0,0.25)", color: "var(--text-secondary)" }}
              >
                {formRedirectUri.trim() || defaultRedirectUri}
              </code>

              {credentialsSource === "env" && (
                <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
                  Sign-in is currently using <strong>server environment</strong> variables. Saving this form will store
                  credentials for <strong>this workspace</strong> and they will take priority.
                </p>
              )}

              <label className="block space-y-1">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Client ID
                </span>
                <input
                  className={inputClass}
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  placeholder="xxxxx.apps.googleusercontent.com"
                  autoComplete="off"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Client secret
                </span>
                <input
                  type="password"
                  className={inputClass}
                  value={formClientSecret}
                  onChange={(e) => setFormClientSecret(e.target.value)}
                  placeholder={hasClientSecret ? "•••••••• (leave blank to keep current)" : "GOCSPX-…"}
                  autoComplete="new-password"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Authorized redirect URI
                </span>
                <input
                  className={inputClass}
                  value={formRedirectUri}
                  onChange={(e) => setFormRedirectUri(e.target.value)}
                  placeholder={defaultRedirectUri}
                />
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={savingApp}
                  onClick={saveAppSettings}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white"
                >
                  {savingApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save OAuth settings
                </button>
                {(formClientId || hasClientSecret) && (
                  <button
                    type="button"
                    onClick={clearWorkspaceCredentials}
                    className="px-3 py-2 rounded-lg text-sm border border-red-500/40 text-red-300 hover:bg-red-500/10"
                  >
                    Clear workspace credentials
                  </button>
                )}
              </div>
            </div>
          )}

          {!canManageApp && configured === false && (
            <div
              className="text-sm p-3 rounded-lg border space-y-2"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                Google sign-in isn&apos;t set up yet
              </p>
              <p className="text-xs">
                Ask a <strong>workspace admin or editor</strong> to open this page and save your organization&apos;s Google OAuth client
                ID and secret above. Alternatively, your host may configure <code className="text-[10px]">GOOGLE_OAUTH_*</code>{" "}
                environment variables.
              </p>
            </div>
          )}

          {!canManageApp && configured === true && credentialsSource === "env" && (
            <p className="text-xs px-3 py-2 rounded-lg border border-white/10" style={{ color: "var(--text-muted)" }}>
              Google is configured by your server environment. Contact an admin if you need changes.
            </p>
          )}

          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              disabled={connecting || !wsId}
              onClick={startConnect}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white"
            >
              {connecting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Redirecting…
                </span>
              ) : (
                "Connect Google account"
              )}
            </button>
            <button
              type="button"
              onClick={() => refresh()}
              className="px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)" }}
            >
              Refresh list
            </button>
            {configured === true && (
              <span className="text-xs" style={{ color: "#34d399" }}>
                OAuth app ready for this workspace
              </span>
            )}
          </div>

          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
          >
            <div
              className="px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
            >
              Connected accounts — {activeWorkspace?.name || "workspace"}
            </div>
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            ) : connections.length === 0 ? (
              <p className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
                No connections yet. Use <strong style={{ color: "var(--text-secondary)" }}>Connect Google account</strong>{" "}
                to authorize Calendar, Docs, and Sheets for this workspace.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                {connections.map((c) => (
                  <li
                    key={c.id}
                    className="px-4 py-3 flex items-center justify-between gap-3"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.email || c.displayName || c.id}</p>
                      {c.displayName && c.email && (
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {c.displayName}
                        </p>
                      )}
                      <p className="text-[10px] mt-1 font-mono truncate opacity-60">{c.id}</p>
                    </div>
                    <button
                      type="button"
                      title="Remove connection"
                      onClick={() => removeConn(c.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <ExternalLink className="w-3 h-3" />
            In the workflow editor, pick <strong className="text-indigo-400">Connected Google account</strong> on Calendar /
            Meet / Docs / Sheets nodes and choose one of these connections.
          </p>
        </>
      )}
    </div>
  );
}
