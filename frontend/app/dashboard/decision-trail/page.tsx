"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  Bot,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  RotateCcw,
  ArrowRight,
  Zap,
  Brain,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BACKEND_URL } from "@/app/config";
import { getAuthHeaders } from "@/lib/auth-token";

// ─── Types ──────────────────────────────────────────────

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  workflow?: {
    id: string;
    name: string;
  };
  steps?: {
    id: string;
    status: string;
    executionTimeMs?: number;
  }[];
}

interface Decision {
  stepId: string;
  nodeId: string;
  nodeLabel: string;
  agentName: string;
  status: string;
  reasoningSummary: string;
  inputSummary: any;
  outputSummary: any;
  executionTimeMs: number;
  retryCount: number;
  timestamp: string;
  isFallback: boolean;
}

interface DecisionTrail {
  runId: string;
  workflowName: string;
  totalDecisions: number;
  decisions: Decision[];
}

// ─── Helpers ────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  FAILED: "text-red-400 bg-red-500/10 border-red-500/20",
  RUNNING: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  PENDING: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  SKIPPED: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  RETRYING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

const RUN_STATUS_STYLES: Record<string, string> = {
  COMPLETED: "text-emerald-400 bg-emerald-500/10",
  FAILED: "text-red-400 bg-red-500/10",
  RUNNING: "text-blue-400 bg-blue-500/10",
  PENDING: "text-zinc-400 bg-zinc-500/10",
  CANCELLED: "text-zinc-500 bg-zinc-500/10",
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── Component ──────────────────────────────────────────

export default function DecisionTrailPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [trail, setTrail] = useState<DecisionTrail | null>(null);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const loadRuns = useCallback(async () => {
    try {
      setLoadingRuns(true);
      const res = await axios.get(`${BACKEND_URL}/api/v1/execution/runs`, {
        headers: getAuthHeaders(),
      });
      setRuns(res.data);
    } catch (err: any) {
      console.error("Failed to load runs:", err);
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoadingRuns(false);
    }
  }, [router]);

  const loadDecisionTrail = useCallback(
    async (runId: string) => {
      try {
        setLoadingTrail(true);
        setTrail(null);
        setExpandedSteps(new Set());
        const res = await axios.get(
          `${BACKEND_URL}/api/v1/execution/runs/${runId}/decisions`,
          { headers: getAuthHeaders() },
        );
        setTrail(res.data);
      } catch (err: any) {
        console.error("Failed to load decision trail:", err);
        if (err.response?.status === 401) {
          router.push("/login");
        }
      } finally {
        setLoadingTrail(false);
      }
    },
    [router],
  );

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    loadDecisionTrail(runId);
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  // Summary stats
  const totalDecisions = trail?.totalDecisions ?? 0;
  const selfHealed = trail?.decisions.filter((d) => d.isFallback).length ?? 0;
  const failed = trail?.decisions.filter((d) => d.status === "FAILED").length ?? 0;

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Decision Trail
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Inspect AI agent reasoning and decision audit trail for each
              workflow run
            </p>
          </div>
          <button
            onClick={loadRuns}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-white/5"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <RefreshCw
              className={`w-4 h-4 ${loadingRuns ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Runs sidebar */}
        <div className="w-80 shrink-0">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Recent Runs
          </h2>
          <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {loadingRuns ? (
              <div
                className="flex items-center justify-center h-32"
                style={{ color: "var(--text-muted)" }}
              >
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
            ) : runs.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-32 rounded-lg border"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <Eye
                  className="w-8 h-8 mb-2"
                  style={{ color: "var(--text-muted)" }}
                />
                <p
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  No runs found
                </p>
              </div>
            ) : (
              runs.map((run) => {
                const isActive = selectedRunId === run.id;
                const statusStyle =
                  RUN_STATUS_STYLES[run.status] || RUN_STATUS_STYLES.PENDING;
                return (
                  <button
                    key={run.id}
                    onClick={() => handleSelectRun(run.id)}
                    className="w-full text-left p-3 rounded-lg border transition-colors"
                    style={{
                      background: isActive
                        ? "rgba(99, 102, 241, 0.08)"
                        : "var(--bg-card)",
                      borderColor: isActive
                        ? "rgba(99, 102, 241, 0.35)"
                        : "var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {run.workflow?.name || "Untitled"}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusStyle}`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className="flex items-center space-x-1 text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(run.createdAt)}</span>
                      </span>
                      {run.steps && (
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {run.steps.length} steps
                        </span>
                      )}
                    </div>
                    <code
                      className="text-[9px] font-mono mt-1 block truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {run.id}
                    </code>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Decision trail content */}
        <div className="flex-1 min-w-0">
          {!selectedRunId ? (
            <div
              className="flex flex-col items-center justify-center h-64 rounded-lg border"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <Brain
                className="w-12 h-12 mb-3"
                style={{ color: "var(--text-muted)" }}
              />
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Select a run to view its decision trail
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                See how AI agents reasoned through each step
              </p>
            </div>
          ) : loadingTrail ? (
            <div
              className="flex items-center justify-center h-64"
              style={{ color: "var(--text-muted)" }}
            >
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : trail ? (
            <div>
              {/* Summary header */}
              <div
                className="p-4 rounded-lg border mb-5"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {trail.workflowName}
                  </h2>
                  <code
                    className="text-[10px] font-mono"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {trail.runId}
                  </code>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-indigo-500/10">
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <p
                        className="text-lg font-bold leading-none"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {totalDecisions}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        decisions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-amber-500/10">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p
                        className="text-lg font-bold leading-none"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {selfHealed}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        self-healed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-red-500/10">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <div>
                      <p
                        className="text-lg font-bold leading-none"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {failed}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        failed
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {trail.decisions.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-40 rounded-lg border"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <Eye
                    className="w-8 h-8 mb-2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No AI decisions recorded for this run
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div
                    className="absolute left-5 top-0 bottom-0 w-px"
                    style={{ background: "var(--border-subtle)" }}
                  />

                  <div className="space-y-3">
                    {trail.decisions.map((decision, index) => {
                      const isExpanded = expandedSteps.has(decision.stepId);
                      const isFailed = decision.status === "FAILED";
                      const isFallback = decision.isFallback;
                      const statusStyle =
                        STATUS_STYLES[decision.status] ||
                        STATUS_STYLES.PENDING;

                      let borderColor = "var(--border-subtle)";
                      if (isFailed) borderColor = "rgba(239, 68, 68, 0.35)";
                      else if (isFallback)
                        borderColor = "rgba(245, 158, 11, 0.35)";

                      let bgColor = "var(--bg-card)";
                      if (isFailed) bgColor = "rgba(239, 68, 68, 0.04)";
                      else if (isFallback)
                        bgColor = "rgba(245, 158, 11, 0.04)";

                      return (
                        <div key={decision.stepId} className="relative pl-12">
                          {/* Timeline dot */}
                          <div
                            className="absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 z-10"
                            style={{
                              background: isFailed
                                ? "rgb(239, 68, 68)"
                                : isFallback
                                  ? "rgb(245, 158, 11)"
                                  : decision.status === "COMPLETED"
                                    ? "rgb(16, 185, 129)"
                                    : "rgb(99, 102, 241)",
                              borderColor: "var(--bg-secondary)",
                            }}
                          />

                          {/* Arrow connector */}
                          {index < trail.decisions.length - 1 && (
                            <div
                              className="absolute left-[18px] top-[28px] w-px h-3"
                              style={{
                                background: "var(--border-subtle)",
                              }}
                            />
                          )}

                          <div
                            className="p-4 rounded-lg border transition-colors"
                            style={{
                              background: bgColor,
                              borderColor: borderColor,
                            }}
                          >
                            {/* Decision header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1 min-w-0">
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${isFallback ? "bg-amber-500/10" : isFailed ? "bg-red-500/10" : "bg-indigo-500/10"}`}
                                >
                                  <Bot
                                    className={`w-4 h-4 ${isFallback ? "text-amber-400" : isFailed ? "text-red-400" : "text-indigo-400"}`}
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                                    <span
                                      className="text-sm font-medium"
                                      style={{
                                        color: "var(--text-primary)",
                                      }}
                                    >
                                      {decision.nodeLabel}
                                    </span>
                                    <span
                                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                      style={{
                                        background: "var(--bg-elevated)",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      {decision.agentName}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusStyle}`}
                                    >
                                      {decision.status}
                                    </span>
                                    {isFallback && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                        Self-Healed
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-3 text-[10px]">
                                    <span
                                      className="flex items-center space-x-1"
                                      style={{
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {formatDate(decision.timestamp)}
                                      </span>
                                    </span>
                                    <span
                                      className="flex items-center space-x-1"
                                      style={{
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      <Zap className="w-3 h-3" />
                                      <span>
                                        {formatMs(decision.executionTimeMs)}
                                      </span>
                                    </span>
                                    {decision.retryCount > 0 && (
                                      <span className="flex items-center space-x-1 text-amber-400">
                                        <RotateCcw className="w-3 h-3" />
                                        <span>
                                          {decision.retryCount}{" "}
                                          {decision.retryCount === 1
                                            ? "retry"
                                            : "retries"}
                                        </span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Reasoning summary preview */}
                                  {decision.reasoningSummary && (
                                    <p
                                      className="text-xs mt-2 line-clamp-2"
                                      style={{
                                        color: "var(--text-secondary)",
                                      }}
                                    >
                                      {decision.reasoningSummary}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => toggleStep(decision.stepId)}
                                className="p-1 rounded hover:bg-white/5 transition-colors ml-2 shrink-0"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            {/* Expanded details */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 pt-4 border-t space-y-4"
                                  style={{
                                    borderColor: "var(--border-subtle)",
                                  }}
                                >
                                  {/* Full reasoning */}
                                  {decision.reasoningSummary && (
                                    <div>
                                      <p
                                        className="text-[10px] font-medium mb-1.5 uppercase tracking-wider"
                                        style={{
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        Agent Reasoning
                                      </p>
                                      <div
                                        className="p-3 rounded-lg text-xs leading-relaxed"
                                        style={{
                                          background: "var(--bg-elevated)",
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        {decision.reasoningSummary}
                                      </div>
                                    </div>
                                  )}

                                  {/* Input / Output */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {decision.inputSummary && (
                                      <div>
                                        <p
                                          className="text-[10px] font-medium mb-1.5 uppercase tracking-wider flex items-center space-x-1"
                                          style={{
                                            color: "var(--text-secondary)",
                                          }}
                                        >
                                          <ArrowRight className="w-3 h-3" />
                                          <span>Input</span>
                                        </p>
                                        <pre
                                          className="p-3 rounded-lg text-xs overflow-auto max-h-48"
                                          style={{
                                            background: "var(--bg-elevated)",
                                            color: "var(--text-secondary)",
                                          }}
                                        >
                                          {JSON.stringify(
                                            decision.inputSummary,
                                            null,
                                            2,
                                          )}
                                        </pre>
                                      </div>
                                    )}
                                    {decision.outputSummary && (
                                      <div>
                                        <p
                                          className="text-[10px] font-medium mb-1.5 uppercase tracking-wider flex items-center space-x-1"
                                          style={{
                                            color: "var(--text-secondary)",
                                          }}
                                        >
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Output</span>
                                        </p>
                                        <pre
                                          className="p-3 rounded-lg text-xs overflow-auto max-h-48"
                                          style={{
                                            background: "var(--bg-elevated)",
                                            color: "var(--text-secondary)",
                                          }}
                                        >
                                          {JSON.stringify(
                                            decision.outputSummary,
                                            null,
                                            2,
                                          )}
                                        </pre>
                                      </div>
                                    )}
                                  </div>

                                  {/* Step metadata */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                      <p
                                        className="text-[10px] font-medium mb-0.5"
                                        style={{
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        Step ID
                                      </p>
                                      <code
                                        className="text-[10px] font-mono"
                                        style={{
                                          color: "var(--text-muted)",
                                        }}
                                      >
                                        {decision.stepId.slice(0, 12)}...
                                      </code>
                                    </div>
                                    <div>
                                      <p
                                        className="text-[10px] font-medium mb-0.5"
                                        style={{
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        Node ID
                                      </p>
                                      <code
                                        className="text-[10px] font-mono"
                                        style={{
                                          color: "var(--text-muted)",
                                        }}
                                      >
                                        {decision.nodeId.slice(0, 12)}...
                                      </code>
                                    </div>
                                    <div>
                                      <p
                                        className="text-[10px] font-medium mb-0.5"
                                        style={{
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        Execution Time
                                      </p>
                                      <span
                                        className="text-xs"
                                        style={{
                                          color: "var(--text-primary)",
                                        }}
                                      >
                                        {formatMs(decision.executionTimeMs)}
                                      </span>
                                    </div>
                                    <div>
                                      <p
                                        className="text-[10px] font-medium mb-0.5"
                                        style={{
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        Retries
                                      </p>
                                      <span
                                        className="text-xs"
                                        style={{
                                          color: "var(--text-primary)",
                                        }}
                                      >
                                        {decision.retryCount}
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
