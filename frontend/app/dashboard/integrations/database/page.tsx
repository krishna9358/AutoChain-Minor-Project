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
  Database,
} from "lucide-react";
import { BACKEND_URL } from "@/app/config";
import { getAuthHeaders } from "@/lib/auth-token";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

type DbConn = {
  id: string;
  name: string;
  status: string;
  metadata: { dbType?: string } | null;
  createdAt: string;
};

export default function DatabaseIntegrationsPage() {
  const { activeWorkspace, loading: wsLoading } = useWorkspace();
  const [connections, setConnections] = useState<DbConn[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [formName, setFormName] = useState("");
  const [formDbType, setFormDbType] = useState("PostgreSQL");
  const [formConnStr, setFormConnStr] = useState("");
  const [saving, setSaving] = useState(false);
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
        `${BACKEND_URL}/api/v1/integrations/database/connections?workspaceId=${encodeURIComponent(wsId)}`,
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
    if (!wsId || !formName.trim() || !formConnStr.trim()) return;
    setSaving(true);
    setBanner(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/integrations/database/connections`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: wsId,
          name: formName.trim(),
          dbType: formDbType,
          connectionString: formConnStr.trim(),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      setBanner({ type: "ok", text: "Database connection added." });
      setFormName("");
      setFormConnStr("");
      setFormDbType("PostgreSQL");
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
      const r = await fetch(`${BACKEND_URL}/api/v1/integrations/database/connections/${id}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Test failed");
      setBanner({ type: "ok", text: data.message || "Connection test passed!" });
      await refresh();
    } catch (e: unknown) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setTestingId(null);
    }
  };

  const removeConn = async (id: string) => {
    if (!confirm("Remove this database connection? Workflows using it will stop working until you reconnect.")) return;
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/integrations/database/connections/${id}`, {
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
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Database
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Configure a <strong>connection string</strong> to connect your workflows to PostgreSQL,
            MySQL, or MongoDB databases.
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
          Join or create a workspace first, then return here to connect a database.
        </p>
      ) : (
        <>
          {/* Add connection form */}
          <div
            className="rounded-xl border p-4 space-y-4"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Add connection
              </h2>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Provide a name, select the database type, and paste your connection string below.
              The connection string is encrypted at rest.
            </p>

            <label className="block space-y-1">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Connection name
              </span>
              <input
                className={inputClass}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Production DB"
                autoComplete="off"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Database type
              </span>
              <select
                className={inputClass}
                value={formDbType}
                onChange={(e) => setFormDbType(e.target.value)}
              >
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="MySQL">MySQL</option>
                <option value="MongoDB">MongoDB</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Connection string
              </span>
              <input
                type="password"
                className={inputClass}
                value={formConnStr}
                onChange={(e) => setFormConnStr(e.target.value)}
                placeholder="postgresql://user:pass@host:5432/dbname"
                autoComplete="new-password"
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={saving || !formName.trim() || !formConnStr.trim()}
                onClick={saveConnection}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 text-white"
                style={{ background: "hsl(var(--primary))" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save connection
              </button>
            </div>
          </div>

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
              Database connections — {activeWorkspace?.name || "workspace"}
            </div>
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : connections.length === 0 ? (
              <p className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
                No connections yet. Use the form above to add a{" "}
                <strong style={{ color: "var(--text-secondary)" }}>database connection</strong>{" "}
                for this workspace.
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
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.metadata?.dbType && (
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {c.metadata.dbType}
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
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"
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
            In the workflow editor, select your <strong className="text-primary">database connection</strong> on
            DB Query nodes.
          </p>
        </>
      )}
    </div>
  );
}
