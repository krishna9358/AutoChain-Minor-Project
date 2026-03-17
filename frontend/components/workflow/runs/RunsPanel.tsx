"use client";

import React, { useState } from "react";
import {
  Activity,
  ChevronRight,
  ChevronDown,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Search,
  FileText,
  Zap,
  Eye,
  EyeOff,
  Copy,
  Download,
  Calendar,
  Tag,
} from "lucide-react";

interface RunStep {
  id: string;
  nodeId: string;
  node?: {
    label: string;
    nodeType: string;
  };
  status: "COMPLETED" | "FAILED" | "RUNNING" | "PENDING" | "WAITING_APPROVAL";
  executionTimeMs?: number;
  inputPayload?: any;
  outputPayload?: any;
  reasoningSummary?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface WorkflowRun {
  id: string;
  status: "COMPLETED" | "FAILED" | "RUNNING" | "PENDING" | "WAITING_APPROVAL";
  startedAt: string;
  completedAt?: string;
  steps: RunStep[];
  workflowId?: string;
  workflowName?: string;
}

interface RunsPanelProps {
  runs: WorkflowRun[];
  activeRun?: WorkflowRun;
  onRunSelect: (run: WorkflowRun) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const RunsPanel: React.FC<RunsPanelProps> = ({
  runs,
  activeRun,
  onRunSelect,
  onRefresh,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showInspector, setShowInspector] = useState(true);
  const [selectedStep, setSelectedStep] = useState<RunStep | null>(null);

  const filteredRuns = runs.filter((run) => {
    const matchesSearch =
      run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (run.workflowName && run.workflowName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || run.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "FAILED":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "RUNNING":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "PENDING":
        return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
      case "WAITING_APPROVAL":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="w-4 h-4" />;
      case "FAILED":
        return <XCircle className="w-4 h-4" />;
      case "RUNNING":
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case "PENDING":
        return <Clock className="w-4 h-4" />;
      case "WAITING_APPROVAL":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  };

  return (
    <div className="h-full flex">
      {/* Runs List */}
      <div className="w-80 border-r overflow-hidden flex flex-col" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              All Runs
            </h3>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: "var(--text-muted)" }}
              title="Refresh runs"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search runs..."
              className="w-full pl-10 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            >
              <option value="all">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="RUNNING">Running</option>
              <option value="PENDING">Pending</option>
              <option value="WAITING_APPROVAL">Waiting Approval</option>
            </select>
          </div>
        </div>

        {/* Runs List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Activity className="w-8 h-8 mb-2 opacity-50" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {runs.length === 0 ? "No runs yet" : "No runs match your filter"}
              </p>
            </div>
          ) : (
            filteredRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => onRunSelect(run)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  activeRun?.id === run.id ? "ring-2 ring-indigo-500/20" : ""
                }`}
                style={{
                  background: activeRun?.id === run.id ? "rgba(99,102,241,0.05)" : "var(--bg-card)",
                  borderColor: activeRun?.id === run.id ? "rgba(99,102,241,0.2)" : "var(--border-subtle)",
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg ${getStatusColor(run.status).split(" ")[1]}`}>
                      {getStatusIcon(run.status)}
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                        {run.workflowName || "Unknown Workflow"}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                        {run.id.substring(0, 8)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeRun?.id === run.id ? "rotate-90" : ""}`} style={{ color: "var(--text-muted)" }} />
                </div>

                <div className="flex items-center space-x-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(run.startedAt)}</span>
                  </div>
                  {run.completedAt && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime())}</span>
                    </div>
                  )}
                  <div className={`flex items-center space-x-1 ${getStatusColor(run.status).split(" ")[0]}`}>
                    <Tag className="w-3 h-3" />
                    <span className="font-medium capitalize">{run.status.toLowerCase().replace("_", " ")}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Event Inspector */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeRun ? (
          <>
            {/* Inspector Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Run {activeRun.id.substring(0, 12)}
                  </h3>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${getStatusColor(activeRun.status)}`}>
                    {activeRun.status.toLowerCase().replace("_", " ")}
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span>Started: {formatDate(activeRun.startedAt)}</span>
                  {activeRun.completedAt && (
                    <span>Completed: {formatDate(activeRun.completedAt)}</span>
                  )}
                  {activeRun.completedAt && (
                    <span>
                      Duration: {formatDuration(new Date(activeRun.completedAt).getTime() - new Date(activeRun.startedAt).getTime())}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowInspector(!showInspector)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: "var(--text-muted)" }}
                title={showInspector ? "Hide Inspector" : "Show Inspector"}
              >
                {showInspector ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Inspector Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {showInspector ? (
                <>
                  {/* Overview Stats */}
                  <div className="mb-6 p-4 rounded-lg border" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                    <h4 className="text-xs font-semibold mb-3 flex items-center space-x-2" style={{ color: "var(--text-primary)" }}>
                      <FileText className="w-4 h-4" />
                      Run Overview
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Total Steps</p>
                        <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                          {activeRun.steps.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Completed</p>
                        <p className="text-lg font-semibold text-emerald-500">
                          {activeRun.steps.filter((s) => s.status === "COMPLETED").length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Failed</p>
                        <p className="text-lg font-semibold text-red-500">
                          {activeRun.steps.filter((s) => s.status === "FAILED").length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Steps Timeline */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold mb-3 flex items-center space-x-2" style={{ color: "var(--text-primary)" }}>
                      <Zap className="w-4 h-4" />
                      Execution Steps
                    </h4>

                    {activeRun.steps.map((step, index) => {
                      const isExpanded = expandedSteps.has(step.id);
                      const isSelected = selectedStep?.id === step.id;

                      return (
                        <div key={step.id} className="rounded-lg border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: isSelected ? "rgba(99,102,241,0.2)" : "var(--border-subtle)" }}>
                          {/* Step Header */}
                          <button
                            onClick={() => {
                              toggleStep(step.id);
                              setSelectedStep(isSelected ? null : step);
                            }}
                            className="w-full p-3 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              {/* Step Number */}
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
                                {index + 1}
                              </div>

                              {/* Step Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                    {step.node?.label || "Unknown Node"}
                                  </p>
                                  {step.executionTimeMs && (
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                      {formatDuration(step.executionTimeMs)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
                                  {step.node?.nodeType || step.nodeId}
                                </p>
                              </div>

                              {/* Status Badge */}
                              <div className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center space-x-1 ${getStatusColor(step.status)}`}>
                                {getStatusIcon(step.status)}
                                <span className="capitalize">{step.status.toLowerCase().replace("_", " ")}</span>
                              </div>
                            </div>

                            {/* Expand/Collapse Toggle */}
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
                          </button>

                          {/* Step Details (Expanded) */}
                          {isExpanded && (
                            <div className="border-t p-4 space-y-4" style={{ borderColor: "var(--border-subtle)" }}>
                              {/* Input Payload */}
                              {step.inputPayload && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                                      Input Payload
                                    </h5>
                                    <button
                                      onClick={() => copyToClipboard(JSON.stringify(step.inputPayload, null, 2))}
                                      className="p-1 rounded hover:bg-white/10 transition-colors"
                                      style={{ color: "var(--text-muted)" }}
                                      title="Copy to clipboard"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <pre className="p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48 overflow-y-auto" style={{ background: "var(--code-bg)", color: "var(--text-secondary)" }}>
                                    {JSON.stringify(step.inputPayload, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Reasoning Summary */}
                              {step.reasoningSummary && (
                                <div>
                                  <h5 className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                                    AI Reasoning
                                  </h5>
                                  <p className="p-3 rounded-lg text-xs leading-relaxed" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                                    {step.reasoningSummary}
                                  </p>
                                </div>
                              )}

                              {/* Output Payload */}
                              {step.outputPayload && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                                      Output Payload
                                    </h5>
                                    <button
                                      onClick={() => copyToClipboard(JSON.stringify(step.outputPayload, null, 2))}
                                      className="p-1 rounded hover:bg-white/10 transition-colors"
                                      style={{ color: "var(--text-muted)" }}
                                      title="Copy to clipboard"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <pre className="p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48 overflow-y-auto text-emerald-500" style={{ background: "var(--code-bg)" }}>
                                    {JSON.stringify(step.outputPayload, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Error */}
                              {step.error && (
                                <div className="p-3 rounded-lg border border-red-500/20" style={{ background: "rgba(239,68,68,0.05)" }}>
                                  <h5 className="text-xs font-medium mb-2 text-red-500 flex items-center space-x-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Error
                                  </h5>
                                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                    {step.error}
                                  </p>
                                </div>
                              )}

                              {/* Timing Info */}
                              {step.startedAt && step.completedAt && (
                                <div className="flex items-center space-x-4 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                  <div className="flex items-center space-x-1">
                                    <Play className="w-3 h-3" />
                                    <span>Started: {formatDate(step.startedAt)}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Completed: {formatDate(step.completedAt)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <EyeOff className="w-12 h-12 mb-3 opacity-50" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm mb-2" style={{ color: "var(--text-primary)" }}>
                    Event Inspector Hidden
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Click the eye icon to view detailed event information
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Activity className="w-12 h-12 mb-3 opacity-50" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm mb-2" style={{ color: "var(--text-primary)" }}>
              No Run Selected
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Select a run from the list to view its details
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
