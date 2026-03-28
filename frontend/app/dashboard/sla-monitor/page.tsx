"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
  Timer,
  TrendingUp,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BACKEND_URL } from "@/app/config";
import { getAuthHeaders } from "@/lib/auth-token";

// ─── Types ──────────────────────────────────────────────

interface NodeMetric {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  avgExecutionTimeMs: number;
  maxExecutionTimeMs: number;
  expectedDurationMs: number;
  slaStatus: "healthy" | "warning" | "breach";
  breachCount: number;
  totalExecutions: number;
}

interface RecentBreach {
  runId: string;
  nodeLabel: string;
  executionTimeMs: number;
  expectedMs: number;
  exceededByMs: number;
  timestamp: string;
}

interface SLAHealthData {
  workflowId: string;
  workflowName: string;
  overallHealth: "healthy" | "warning" | "breach";
  totalRuns: number;
  nodeMetrics: NodeMetric[];
  recentBreaches: RecentBreach[];
}

interface WorkflowOption {
  id: string;
  name: string;
}

// ─── Helpers ────────────────────────────────────────────

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function statusConfig(status: "healthy" | "warning" | "breach") {
  switch (status) {
    case "healthy":
      return {
        label: "All SLAs Met",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        dot: "bg-emerald-500",
        ring: "ring-emerald-500/20",
        Icon: CheckCircle2,
      };
    case "warning":
      return {
        label: "Warning",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        dot: "bg-amber-500",
        ring: "ring-amber-500/20",
        Icon: AlertTriangle,
      };
    case "breach":
      return {
        label: "SLA Breach",
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        dot: "bg-red-500",
        ring: "ring-red-500/20",
        Icon: ShieldAlert,
      };
  }
}

function barColor(status: "healthy" | "warning" | "breach") {
  switch (status) {
    case "healthy":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "breach":
      return "bg-red-500";
  }
}

// ─── Component ──────────────────────────────────────────

export default function SLAMonitorPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [data, setData] = useState<SLAHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load workflows list
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/v1/workflows`, {
          headers: getAuthHeaders(),
        });
        const wfs = (res.data || []).map((w: any) => ({
          id: w.id,
          name: w.name,
        }));
        setWorkflows(wfs);
        if (wfs.length > 0 && !selectedWorkflowId) {
          setSelectedWorkflowId(wfs[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoadingWorkflows(false);
      }
    })();
  }, []);

  const fetchSLAHealth = useCallback(async () => {
    if (!selectedWorkflowId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/v1/execution/sla-health`,
        {
          params: { workflowId: selectedWorkflowId },
          headers: getAuthHeaders(),
        },
      );
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to load SLA data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflowId]);

  useEffect(() => {
    fetchSLAHealth();
  }, [fetchSLAHealth]);

  const overall = data ? statusConfig(data.overallHealth) : null;

  return (
    <div className="flex-1 min-h-screen p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
          >
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              SLA Monitor
            </h1>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              Track node performance against expected durations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Workflow selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-white/5"
              style={{
                borderColor: "var(--border-subtle)",
                color: "var(--text-secondary)",
                background: "var(--bg-secondary)",
                minWidth: 200,
              }}
            >
              <span className="truncate flex-1 text-left">
                {loadingWorkflows
                  ? "Loading..."
                  : workflows.find((w) => w.id === selectedWorkflowId)?.name ||
                    "Select workflow"}
              </span>
              <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
            </button>
            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-full rounded-lg border shadow-xl z-50 py-1 max-h-60 overflow-y-auto"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {workflows.map((wf) => (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => {
                      setSelectedWorkflowId(wf.id);
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors truncate"
                    style={{
                      color:
                        wf.id === selectedWorkflowId
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      background:
                        wf.id === selectedWorkflowId
                          ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                          : "transparent",
                    }}
                  >
                    {wf.name}
                  </button>
                ))}
                {workflows.length === 0 && (
                  <p
                    className="px-3 py-2 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No workflows found
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={fetchSLAHealth}
            disabled={loading || !selectedWorkflowId}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw
            className="w-6 h-6 animate-spin"
            style={{ color: "var(--text-muted)" }}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border px-4 py-3 text-sm bg-red-500/10 border-red-500/30 text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Data */}
      {data && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Overall Health Badge + Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Health badge */}
            <div
              className={`rounded-xl border p-5 flex items-center gap-4 ${overall?.bg} ${overall?.border}`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ring-4 ${overall?.ring}`}
              >
                <div
                  className={`w-5 h-5 rounded-full ${overall?.dot} animate-pulse`}
                />
              </div>
              <div>
                <p className={`text-lg font-bold ${overall?.color}`}>
                  {overall?.label}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {data.workflowName}
                </p>
              </div>
            </div>

            {/* Total runs */}
            <div
              className="rounded-xl border p-5"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-secondary)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp
                  className="w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Runs Analyzed
                </span>
              </div>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {data.totalRuns}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Last {data.totalRuns} completed runs
              </p>
            </div>

            {/* Nodes monitored */}
            <div
              className="rounded-xl border p-5"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-secondary)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Timer
                  className="w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Nodes Monitored
                </span>
              </div>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {data.nodeMetrics.length}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                {data.nodeMetrics.filter((n) => n.slaStatus === "breach").length}{" "}
                breaching,{" "}
                {data.nodeMetrics.filter((n) => n.slaStatus === "warning").length}{" "}
                warning
              </p>
            </div>
          </div>

          {/* Node Performance Table */}
          {data.nodeMetrics.length > 0 && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-secondary)",
              }}
            >
              <div
                className="px-5 py-4 border-b flex items-center gap-2"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <Clock
                  className="w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Node Performance
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b text-xs uppercase tracking-wider"
                      style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-muted)",
                      }}
                    >
                      <th className="text-left px-5 py-3 font-medium">Node</th>
                      <th className="text-left px-5 py-3 font-medium">
                        Avg Time
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        Expected
                      </th>
                      <th className="text-left px-5 py-3 font-medium min-w-[200px]">
                        Performance
                      </th>
                      <th className="text-center px-5 py-3 font-medium">
                        Breaches
                      </th>
                      <th className="text-center px-5 py-3 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.nodeMetrics.map((node, i) => {
                      const pct = Math.min(
                        (node.avgExecutionTimeMs / node.expectedDurationMs) *
                          100,
                        100,
                      );
                      const sc = statusConfig(node.slaStatus);
                      return (
                        <motion.tr
                          key={node.nodeId}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
                          style={{ borderColor: "var(--border-subtle)" }}
                        >
                          <td className="px-5 py-3.5">
                            <div>
                              <p
                                className="font-medium"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {node.nodeLabel}
                              </p>
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {node.nodeType} &middot;{" "}
                                {node.totalExecutions} executions
                              </p>
                            </div>
                          </td>
                          <td
                            className="px-5 py-3.5 font-mono text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {formatMs(node.avgExecutionTimeMs)}
                          </td>
                          <td
                            className="px-5 py-3.5 font-mono text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {formatMs(node.expectedDurationMs)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex-1 h-2.5 rounded-full overflow-hidden"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                }}
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{
                                    duration: 0.8,
                                    delay: i * 0.04,
                                    ease: "easeOut",
                                  }}
                                  className={`h-full rounded-full ${barColor(node.slaStatus)}`}
                                />
                              </div>
                              <span
                                className="text-xs font-mono w-10 text-right shrink-0"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {Math.round(pct)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {node.breachCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                                <XCircle className="w-3 h-3" />
                                {node.breachCount}
                              </span>
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                0
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}
                            >
                              <sc.Icon className="w-3 h-3" />
                              {node.slaStatus === "healthy"
                                ? "Healthy"
                                : node.slaStatus === "warning"
                                  ? "Warning"
                                  : "Breach"}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Breaches */}
          {data.recentBreaches.length > 0 && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-secondary)",
              }}
            >
              <div
                className="px-5 py-4 border-b flex items-center gap-2"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Recent SLA Breaches
                </h2>
                <span
                  className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium"
                >
                  {data.recentBreaches.length} breach
                  {data.recentBreaches.length !== 1 ? "es" : ""}
                </span>
              </div>

              <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                {data.recentBreaches.map((breach, i) => (
                  <motion.div
                    key={`${breach.runId}-${breach.nodeLabel}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {breach.nodeLabel}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Took{" "}
                        <span className="text-red-400 font-medium">
                          {formatMs(breach.executionTimeMs)}
                        </span>{" "}
                        / expected {formatMs(breach.expectedMs)} &middot;
                        Exceeded by{" "}
                        <span className="text-red-400 font-medium">
                          {formatMs(breach.exceededByMs)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-xs font-mono"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {new Date(breach.timestamp).toLocaleDateString()}
                      </p>
                      <p
                        className="text-xs font-mono"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {new Date(breach.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {data.totalRuns === 0 && (
            <div
              className="rounded-xl border p-12 text-center"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-secondary)",
              }}
            >
              <Activity
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "var(--text-muted)" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                No completed runs yet
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Run this workflow at least once to see SLA metrics
              </p>
            </div>
          )}

          {data.totalRuns > 0 && data.nodeMetrics.length === 0 && (
            <div
              className="rounded-xl border p-12 text-center"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-secondary)",
              }}
            >
              <CheckCircle2
                className="w-10 h-10 mx-auto mb-3 text-emerald-400"
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                No node execution data available
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Node steps need recorded execution times to display metrics
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
