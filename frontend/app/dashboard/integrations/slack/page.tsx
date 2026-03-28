"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  KeyRound,
  Play,
} from "lucide-react";
import { SlackLogo } from "@/components/workflow/icons/ServiceLogos";
import { BACKEND_URL } from "@/app/config";
import { getAuthHeaders } from "@/lib/auth-token";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

type SlackConn = {
  id: string;
  name: string;
  status: string;
  metadata: { mode?: "webhook" | "bot"; team?: string } | null;
  createdAt: string;
};

export default function SlackIntegrationsPage() {
  const { activeWorkspace, loading: wsLoading } = useWorkspace();
  const [connections, setConnections] = useState<SlackConn[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formMode, setFormMode] = useState<"webhook" | "bot">("webhook");
  const [formWebhookUrl, setFormWebhookUrl] = useState("");
  const [formBotToken, setFormBotToken] = useState("");
  const [saving, setSaving] = useState(false);

  // Testing state
  const [testingId, setTestingId] = useState<string | null>(null);

  const wsId = activeWorkspace?.id ?? "";

  const refresh = useCallback(async () => {
    if (!wsId) {
      setConnections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(
        `${BACKEND_URL}/api/v1/integrations/slack/connections?workspaceId=${encodeURIComponent(wsId)}`,
        { headers: getAuthHeaders() },
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

  const saveConnection = async () => {
    if (!wsId || !formName.trim()) return;
    setSaving(true);
    setBanner(null);
    try {
      const payload: Record<string, string> = {
        workspaceId: wsId,
        name: formName.trim(),
        mode: formMode,
      };
      if (formMode === "webhook") {
        if (!formWebhookUrl.trim()) throw new Error("Webhook URL is required");
        payload.webhookUrl = formWebhookUrl.trim();
      } else {
        if (!formBotToken.trim()) throw new Error("Bot Token is required");
        payload.botToken = formBotToken.trim();
      }
      const r = await fetch(`${BACKEND_URL}/api/v1/integrations/slack/connections`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      setBanner({ type: "ok", text: "Slack connection created." });
      setFormName("");
      setFormWebhookUrl("");
      setFormBotToken("");
      await refresh();
    } catch (e: unknown) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (id: string) => {
    setTestingId(id);
    setBanner(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/integrations/slack/connections/${id}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Test failed");
      setBanner({ type: "ok", text: "Connection test succeeded." });
    } catch (e: unknown) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setTestingId(null);
    }
  };

  const removeConn = async (id: string) => {
    if (!confirm("Remove this Slack connection? Workflows using it will stop working until you reconnect.")) return;
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/integrations/slack/connections/${id}`, {
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
    "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border transition-colors border-[var(--border-medium)] bg-[var(--input-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div
          className="p-2.5 rounded-xl border"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <SlackLogo className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Slack
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Configure Slack connections via <strong>Incoming Webhook</strong> or{" "}
            <strong>Bot Token</strong> to send messages to channels from your workflows.
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
          Join or create a workspace first, then return here to connect Slack.
        </p>
      ) : (
        <>
          {/* Add Connection form */}
          <div
            className="rounded-xl border p-4 space-y-4"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Add Slack connection
              </h2>
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Connection Name
              </span>
              <input
                className={inputClass}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Team Notifications"
                autoComplete="off"
              />
            </label>

            <div className="space-y-1">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Mode
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormMode("webhook")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formMode === "webhook"
                      ? "text-white"
                      : "border border-[var(--border-medium)] text-[var(--text-secondary)]"
                  }`}
                  style={formMode === "webhook" ? { background: "hsl(var(--primary))" } : undefined}
                >
                  Webhook
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode("bot")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formMode === "bot"
                      ? "text-white"
                      : "border border-[var(--border-medium)] text-[var(--text-secondary)]"
                  }`}
                  style={formMode === "bot" ? { background: "hsl(var(--primary))" } : undefined}
                >
                  Bot Token
                </button>
              </div>
            </div>

            {formMode === "webhook" ? (
              <label className="block space-y-1">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Webhook URL
                </span>
                <input
                  className={inputClass}
                  value={formWebhookUrl}
                  onChange={(e) => setFormWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  autoComplete="off"
                />
              </label>
            ) : (
              <label className="block space-y-1">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Bot Token
                </span>
                <input
                  type="password"
                  className={inputClass}
                  value={formBotToken}
                  onChange={(e) => setFormBotToken(e.target.value)}
                  placeholder="xoxb-..."
                  autoComplete="new-password"
                />
              </label>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={saving || !formName.trim()}
                onClick={saveConnection}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 text-white"
                style={{ background: "hsl(var(--primary))" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save connection
              </button>
            </div>
          </div>

          {/* Refresh */}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => refresh()}
              className="px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)" }}
            >
              Refresh list
            </button>
          </div>

          {/* Connection list */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
          >
            <div
              className="px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
            >
              Slack connections — {activeWorkspace?.name || "workspace"}
            </div>
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : connections.length === 0 ? (
              <p className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
                No connections yet. Use the form above to add a Slack webhook or bot connection.
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <span
                          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                          style={{
                            background: "hsl(var(--primary))",
                            color: "white",
                            opacity: 0.85,
                          }}
                        >
                          {c.metadata?.mode || "webhook"}
                        </span>
                      </div>
                      {c.metadata?.team && (
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          Team: {c.metadata.team}
                        </p>
                      )}
                      <p className="text-[10px] mt-1 font-mono truncate opacity-60">
                        Created {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Test connection"
                        onClick={() => testConnection(c.id)}
                        disabled={testingId === c.id}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary"
                      >
                        {testingId === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Remove connection"
                        onClick={() => removeConn(c.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <ExternalLink className="w-3 h-3" />
            In the workflow editor, select your Slack connection on Slack nodes to send messages to channels.
          </p>
        </>
      )}
    </div>
  );
}
