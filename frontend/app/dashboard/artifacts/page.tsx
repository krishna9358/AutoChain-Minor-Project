"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/app/config";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { getAuthHeaders } from "@/lib/auth-token";
import {
  Archive,
  Loader2,
  RefreshCw,
  Trash2,
  FileJson,
  Calendar,
} from "lucide-react";

interface ArtifactRow {
  id: string;
  name: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  workflowId?: string | null;
  runId?: string | null;
  nodeId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  workspace?: { id: string; name: string };
}

export default function ArtifactsLibraryPage() {
  const { hasWorkspace, loading: wsLoading } = useWorkspace();
  const [items, setItems] = useState<ArtifactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hasWorkspace) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      // Omit workspaceId so backend returns artifacts from every workspace you’re in.
      // (Filtering only the “active” workspace often mismatched the workflow’s workspace.)
      const res = await axios.get(`${BACKEND_URL}/api/v1/artifacts`, {
        headers: getAuthHeaders(),
      });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error(e);
      setItems([]);
      setLoadError(
        e?.response?.data?.error ||
          e?.message ||
          "Could not load artifacts (check login and backend URL).",
      );
    } finally {
      setLoading(false);
    }
  }, [hasWorkspace]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this artifact record?")) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/artifacts/${id}`, {
        headers: getAuthHeaders(),
      });
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      alert(e.response?.data?.error || "Delete failed");
    }
  };

  if (wsLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-6 h-6 text-indigo-500 shrink-0" />
            <h1
              className="text-xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Artifact library
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Outputs from <strong>Artifact Writer</strong> nodes after each run.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-white/5"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <main>
        {!hasWorkspace && (
          <p
            className="text-sm p-6 rounded-xl border border-dashed"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
          >
            Select or create a workspace from the dashboard, then open this page again.
          </p>
        )}

        {hasWorkspace && loadError && (
          <div
            className="mb-4 p-3 rounded-xl text-sm border"
            style={{
              borderColor: "rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.08)",
              color: "#f87171",
            }}
          >
            {loadError}
          </div>
        )}

        {hasWorkspace && loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        )}

        {hasWorkspace && !loading && !loadError && items.length === 0 && (
          <div
            className="text-center py-16 rounded-2xl border"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-muted)",
            }}
          >
            <FileJson className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No artifacts yet.</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              Run a workflow that includes an Artifact Writer node. If runs show
              &quot;Completed&quot; but nothing appears here, ensure the database has the{" "}
              <code className="text-indigo-400">Artifact</code> table (
              <code className="text-indigo-400">npx prisma db push</code> in{" "}
              <code className="text-indigo-400">primary-backend</code>) and check
              server logs for insert errors.
            </p>
          </div>
        )}

        {hasWorkspace && !loading && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 p-4 rounded-xl border"
                style={{
                  borderColor: "var(--border-subtle)",
                  background: "var(--bg-card)",
                }}
              >
                <Archive className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {a.name}
                  </p>
                  <div
                    className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                    {a.mimeType && <span>{a.mimeType}</span>}
                    {a.sizeBytes != null && <span>{a.sizeBytes} bytes</span>}
                  </div>
                    {a.workspace?.name && (
                    <p className="text-[10px] mt-1 opacity-70">
                      Workspace: {a.workspace.name}
                    </p>
                  )}
                  {a.runId && (
                    <p className="text-[10px] font-mono mt-1 truncate opacity-70">
                      run: {a.runId}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 shrink-0"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
