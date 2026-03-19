"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ScrollText,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  Monitor,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BACKEND_URL } from "@/app/config";

const IS_DEV = process.env.NODE_ENV === "development";
const DEV_TOKEN = "dev-token-12345";

function token() {
  if (IS_DEV) return DEV_TOKEN;
  const stored = localStorage.getItem("autochain-auth-token");
  return stored ? `Bearer ${stored}` : null;
}

interface AuditLog {
  id: string;
  workflowId?: string;
  userId: string;
  action: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  workflow?: {
    id: string;
    name: string;
  };
}

const ACTION_COLORS: Record<string, string> = {
  "workflow.created": "text-emerald-500 bg-emerald-500/10",
  "workflow.updated": "text-blue-500 bg-blue-500/10",
  "workflow.deleted": "text-red-500 bg-red-500/10",
  "run.started": "text-indigo-500 bg-indigo-500/10",
  "run.completed": "text-emerald-500 bg-emerald-500/10",
  "run.failed": "text-red-500 bg-red-500/10",
  "secret.created": "text-amber-500 bg-amber-500/10",
  "secret.updated": "text-blue-500 bg-blue-500/10",
  "secret.deleted": "text-red-500 bg-red-500/10",
  "api-key.created": "text-purple-500 bg-purple-500/10",
  "api-key.updated": "text-blue-500 bg-blue-500/10",
  "api-key.deleted": "text-red-500 bg-red-500/10",
  "api-key.revoked": "text-amber-500 bg-amber-500/10",
};

const ACTION_ICONS: Record<string, string> = {
  "workflow.created": "created",
  "workflow.updated": "edited",
  "workflow.deleted": "deleted",
  "run.started": "play",
  "run.completed": "check",
  "run.failed": "alert",
  "secret.created": "shield",
  "secret.updated": "lock",
  "secret.deleted": "trash",
  "api-key.created": "key",
  "api-key.updated": "edit",
  "api-key.deleted": "trash",
  "api-key.revoked": "ban",
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // UI states
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Get unique values for filters
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const uniqueUsers = Array.from(new Set(logs.map((l) => l.user?.name).filter(Boolean))).sort();
  const uniqueWorkflows = Array.from(new Set(logs.map((l) => l.workflow?.name).filter(Boolean))).sort();

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit };
      if (workflowFilter !== "all") params.workflowId = workflowFilter;
      if (actionFilter !== "all") params.action = actionFilter;

      const res = await axios.get(`${BACKEND_URL}/api/v1/audit`, {
        headers: { Authorization: token()! },
        params,
      });
      setLogs(res.data);
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router, limit, workflowFilter, actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter((log) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.workflow?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toString().toLowerCase().includes(searchQuery.toLowerCase());

    // Action filter
    const matchesAction = actionFilter === "all" || log.action === actionFilter;

    // User filter
    const matchesUser = userFilter === "all" || log.user?.name === userFilter;

    // Workflow filter
    const matchesWorkflow = workflowFilter === "all" || log.workflowId === workflowFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter !== "all") {
      const logDate = new Date(log.createdAt);
      const now = new Date();

      switch (dateFilter) {
        case "1h":
          matchesDate = logDate >= new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "24h":
          matchesDate = logDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          matchesDate = logDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          matchesDate = logDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    return matchesSearch && matchesAction && matchesUser && matchesWorkflow && matchesDate;
  });

  const paginatedLogs = filteredLogs.slice(0, page * limit);
  const hasMore = paginatedLogs.length < filteredLogs.length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than a minute
    if (diff < 60 * 1000) {
      return "Just now";
    }

    // Less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}m ago`;
    }

    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }

    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}d ago`;
    }

    // Format full date
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionLabel = (action: string) => {
    return action
      .split(".")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleViewWorkflow = (workflowId: string) => {
    router.push(`/workflow/${workflowId}`);
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Audit Logs
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Track all activity and changes in your workspace
            </p>
          </div>
          <button
            onClick={loadLogs}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters ? "bg-indigo-600 text-white" : ""
            }`}
            style={
              !showFilters
                ? { background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }
                : undefined
            }
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-lg space-y-4"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Action
                  </label>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="all">All Actions</option>
                    {uniqueActions.map((action) => (
                      <option key={action} value={action}>
                        {getActionLabel(action)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    User
                  </label>
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="all">All Users</option>
                    {uniqueUsers.map((user) => (
                      <option key={user} value={user}>
                        {user}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Workflow
                  </label>
                  <select
                    value={workflowFilter}
                    onChange={(e) => setWorkflowFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="all">All Workflows</option>
                    {uniqueWorkflows.map((workflow) => (
                      <option key={workflow} value={workflow}>
                        {workflow}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Time Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 rounded-lg border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
          >
            <ScrollText className="w-12 h-12 mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              No audit logs found
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {logs.length === 0
                ? "Activity will appear here as you use the platform"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <>
            {paginatedLogs.map((log) => {
              const isExpanded = expandedLog === log.id;
              const actionColor = ACTION_COLORS[log.action] || "text-gray-500 bg-gray-500/10";

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border transition-colors"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: isExpanded ? "rgba(99,102,241,0.3)" : "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${actionColor.split(" ")[1]}`}>
                        <ScrollText className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${actionColor}`}>
                            {getActionLabel(log.action)}
                          </span>
                          <span className="flex items-center space-x-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(log.createdAt)}</span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 mb-2">
                          <span className="flex items-center space-x-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <User className="w-3 h-3" />
                            <span className="truncate">{log.user?.name || "Unknown User"}</span>
                          </span>
                          {log.ipAddress && (
                            <span className="flex items-center space-x-1 text-xs" style={{ color: "var(--text-muted)" }}>
                              <Monitor className="w-3 h-3" />
                              <span className="truncate">{log.ipAddress}</span>
                            </span>
                          )}
                        </div>

                        {log.workflow && (
                          <button
                            onClick={() => handleViewWorkflow(log.workflow!.id)}
                            className="flex items-center space-x-1 text-xs hover:text-indigo-500 transition-colors"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            <FileText className="w-3 h-3" />
                            <span className="truncate">{log.workflow.name}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      className="p-1 rounded hover:bg-white/5 transition-colors ml-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t space-y-2"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        <div>
                          <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                            Log ID
                          </p>
                          <code className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                            {log.id}
                          </code>
                        </div>

                        {log.user && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                                User
                              </p>
                              <p className="text-xs" style={{ color: "var(--text-primary)" }}>
                                {log.user.name}
                              </p>
                              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                {log.user.email}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                                Timestamp
                              </p>
                              <p className="text-xs" style={{ color: "var(--text-primary)" }}>
                                {new Date(log.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {log.details && (
                          <div>
                            <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                              Details
                            </p>
                            <pre className="p-3 rounded-lg text-xs overflow-auto max-h-48"
                              style={{
                                background: "var(--code-bg)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="w-full py-3 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Load More
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
