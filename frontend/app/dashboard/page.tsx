"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { useToast } from "@/components/hooks/use-toast";
import { workflowApi } from "@/lib/api";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import {
  Zap,
  Plus,
  ChevronRight,
  Loader2,
  Workflow,
  Settings,
  LogOut,
  Search,
  Sun,
  Moon,
  LayoutTemplate,
  Key,
  ArrowRight,
  ScrollText,
  ChevronsUpDown,
  Check,
  Building2,
  FolderPlus,
  ChevronDown,
  Bell,
  MoreHorizontal,
  Trash2,
  Edit2,
  Copy,
  Filter,
  SlidersHorizontal,
  Tag,
} from "lucide-react";

interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
  edges: any[];
  _count?: { runs: number; versions: number };
}

const STATUS_CONFIG: Record<
  string,
  { color: string; dot: string; bg: string }
> = {
  DRAFT: {
    color: "text-zinc-500",
    dot: "bg-zinc-400",
    bg: "bg-zinc-400/10",
  },
  ACTIVE: {
    color: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
  },
  PAUSED: {
    color: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
  },
  ARCHIVED: {
    color: "text-zinc-500",
    dot: "bg-zinc-500",
    bg: "bg-zinc-500/10",
  },
};

const TEMPLATES = [
  {
    id: "meeting",
    name: "Meeting Intelligence",
    icon: "🎤",
    description:
      "Process meeting transcripts, extract action items, and notify on Slack",
    nodes: [
      {
        nodeType: "WEBHOOK_TRIGGER",
        label: "Meeting Webhook",
        category: "TRIGGER",
        config: {},
      },
      {
        nodeType: "EXTRACTION_AGENT",
        label: "Extract Actions",
        category: "AI_AGENT",
        config: {},
      },
      {
        nodeType: "SLACK_SEND",
        label: "Notify Team",
        category: "ACTION",
        config: {},
      },
    ],
  },
  {
    id: "support",
    name: "Support Ticket AI",
    icon: "🎫",
    description:
      "Auto-classify tickets, draft AI responses, and route to the right team",
    nodes: [
      {
        nodeType: "WEBHOOK_TRIGGER",
        label: "New Ticket",
        category: "TRIGGER",
        config: {},
      },
      {
        nodeType: "CLASSIFICATION_AGENT",
        label: "Classify Issue",
        category: "AI_AGENT",
        config: {},
      },
      {
        nodeType: "EMAIL_SEND",
        label: "Send Reply",
        category: "ACTION",
        config: {},
      },
    ],
  },
  {
    id: "sales",
    name: "Lead Qualification",
    icon: "🎯",
    description: "Score and qualify inbound leads, then route to sales reps",
    nodes: [
      {
        nodeType: "API_TRIGGER",
        label: "New Lead",
        category: "TRIGGER",
        config: {},
      },
      {
        nodeType: "DECISION_AGENT",
        label: "Score Lead",
        category: "AI_AGENT",
        config: {},
      },
      {
        nodeType: "EMAIL_SEND",
        label: "Notify Rep",
        category: "ACTION",
        config: {},
      },
    ],
  },
  {
    id: "invoice",
    name: "Invoice Processing",
    icon: "📄",
    description: "Extract invoice data, validate, and route for approval",
    nodes: [
      {
        nodeType: "FILE_UPLOAD_TRIGGER",
        label: "Invoice Upload",
        category: "TRIGGER",
        config: {},
      },
      {
        nodeType: "EXTRACTION_AGENT",
        label: "Extract Data",
        category: "AI_AGENT",
        config: {},
      },
      {
        nodeType: "APPROVAL",
        label: "Manager Approval",
        category: "CONTROL",
        config: {},
      },
    ],
  },
  {
    id: "onboarding",
    name: "Employee Onboarding",
    icon: "👋",
    description: "Automate new hire setup with IT provisioning",
    nodes: [
      {
        nodeType: "WEBHOOK_TRIGGER",
        label: "New Hire Event",
        category: "TRIGGER",
        config: {},
      },
      {
        nodeType: "HTTP_REQUEST",
        label: "Create Accounts",
        category: "ACTION",
        config: {},
      },
      {
        nodeType: "EMAIL_SEND",
        label: "Welcome Email",
        category: "ACTION",
        config: {},
      },
    ],
  },
  {
    id: "incident",
    name: "Incident Response",
    icon: "🚨",
    description: "Classify alerts, analyze root cause, and escalate as needed",
    nodes: [
      {
        nodeType: "WEBHOOK_TRIGGER",
        label: "Alert Received",
        category: "TRIGGER",
        config: {},
      },
      {
        nodeType: "CLASSIFICATION_AGENT",
        label: "Classify Severity",
        category: "AI_AGENT",
        config: {},
      },
      {
        nodeType: "SLACK_SEND",
        label: "Notify On-Call",
        category: "ACTION",
        config: {},
      },
    ],
  },
];

type TabId = "workflows" | "templates" | "settings";
type StatusFilter = "all" | "ACTIVE" | "DRAFT" | "PAUSED" | "ARCHIVED";
type SortBy = "updatedAt" | "createdAt" | "name";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    hasWorkspace,
    loading: wsLoading,
    refreshWorkspaces,
  } = useWorkspace();
  const { toast } = useToast();

  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("workflows");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false);
  const [rowMenuOpen, setRowMenuOpen] = useState<string | null>(null);
  const wsSwitcherRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wsSwitcherRef.current &&
        !wsSwitcherRef.current.contains(e.target as Node)
      ) {
        setWsSwitcherOpen(false);
      }
      if (rowMenuOpen) setRowMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [rowMenuOpen]);

  useEffect(() => {
    if (!hasWorkspace || !activeWorkspace) {
      setWorkflows([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const data = await workflowApi.list();
        setWorkflows(data || []);
      } catch (err: any) {
        toast({
          title: "Failed to load workflows",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeWorkspace?.id, hasWorkspace]);

  const importTemplate = (template: (typeof TEMPLATES)[0]) => {
    if (!hasWorkspace) {
      toast({
        title: "Workspace required",
        description: "Create a workspace first.",
        variant: "destructive",
      });
      setShowCreateWs(true);
      return;
    }
    const nodes = template.nodes.map((n, i) => ({
      id: `${n.nodeType}-${Date.now()}-${i}`,
      type: "workflowNode",
      position: { x: 300, y: i * 140 },
      data: n,
    }));
    const edges = nodes.slice(0, -1).map((n, i) => ({
      id: `e-${i}`,
      source: n.id,
      target: nodes[i + 1].id,
    }));
    sessionStorage.setItem(
      "template-import",
      JSON.stringify({
        name: template.name,
        description: template.description,
        nodes,
        edges,
      }),
    );
    router.push("/workflow/new?from=template");
  };

  const deleteWorkflow = async (id: string, name: string) => {
    try {
      await workflowApi.delete(id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast({
        title: "Workflow deleted",
        description: `"${name}" has been removed.`,
        variant: "default",
      });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const filtered = workflows
    .filter((w) => {
      const matchSearch =
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.description?.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || w.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return (
        new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime()
      );
    });

  const userName =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || '{"name":"Dev User"}').name
      : "Dev User";

  if (wsLoading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ─── Top Navigation Bar ──── */}
      <nav
        className="sticky top-0 z-40 h-12 flex items-center border-b px-4 gap-0"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Left: Logo + Workspace Switcher */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span
              className="text-sm font-semibold hidden sm:block"
              style={{ color: "var(--text-primary)" }}
            >
              AutoChain
            </span>
          </div>

          <div
            className="w-px h-5"
            style={{ background: "var(--border-subtle)" }}
          />

          {/* Workspace selector */}
          <div className="relative" ref={wsSwitcherRef}>
            <button
              onClick={() => setWsSwitcherOpen(!wsSwitcherOpen)}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
              style={{
                background: wsSwitcherOpen
                  ? "rgba(99,102,241,0.08)"
                  : "transparent",
                color: "var(--text-primary)",
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: "rgba(99,102,241,0.8)" }}
              >
                {activeWorkspace
                  ? activeWorkspace.name.charAt(0).toUpperCase()
                  : "?"}
              </div>
              <span className="max-w-[120px] truncate">
                {activeWorkspace?.name || "No Workspace"}
              </span>
              <ChevronsUpDown className="w-3 h-3 opacity-50" />
            </button>

            <AnimatePresence>
              {wsSwitcherOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  className="absolute top-full left-0 mt-1.5 w-56 rounded-xl border shadow-2xl overflow-hidden z-50"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="p-1.5">
                    <p
                      className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Workspaces
                    </p>
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspace(ws);
                          setWsSwitcherOpen(false);
                          toast({
                            title: "Switched workspace",
                            description: `Now using "${ws.name}"`,
                            variant: "success",
                          });
                        }}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors hover:bg-white/5"
                        style={{
                          background:
                            activeWorkspace?.id === ws.id
                              ? "rgba(99,102,241,0.06)"
                              : "transparent",
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: "rgba(99,102,241,0.7)" }}
                        >
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p
                            className="text-xs font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {ws.name}
                          </p>
                          {ws.slug && (
                            <p
                              className="text-[10px] truncate"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {ws.slug}
                            </p>
                          )}
                        </div>
                        {activeWorkspace?.id === ws.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div
                    className="border-t p-1.5"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <button
                      onClick={() => {
                        setWsSwitcherOpen(false);
                        setShowCreateWs(true);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors hover:bg-white/5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">
                        New Workspace
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Tab navigation */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {(["workflows", "templates", "settings"] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative px-4 h-12 text-sm font-medium transition-colors capitalize"
              style={{
                color:
                  activeTab === tab
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
              }}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <button
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              router.push("/login");
            }}
            className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white ml-1"
            title="Sign out"
          >
            {userName.charAt(0).toUpperCase()}
          </button>
        </div>
      </nav>

      {/* ─── Main Content ──── */}
      <main className="flex-1 px-6 py-6 max-w-[1400px] w-full mx-auto">
        {/* No workspace banner */}
        {!hasWorkspace && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-8 rounded-2xl border-2 border-dashed text-center"
            style={{ borderColor: "rgba(99,102,241,0.25)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(99,102,241,0.08)" }}
            >
              <Building2 className="w-7 h-7 text-indigo-500" />
            </div>
            <h3
              className="text-base font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Create your first workspace
            </h3>
            <p
              className="text-sm mb-5 max-w-sm mx-auto leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Workspaces organize your workflows, secrets, and team members.
              Create one to get started.
            </p>
            <button
              onClick={() => setShowCreateWs(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              Create Workspace
            </button>
          </motion.div>
        )}

        {/* ──── Workflows Tab ──── */}
        {activeTab === "workflows" && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h1
                className="text-xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Workflows
              </h1>
              {hasWorkspace && (
                <button
                  onClick={() => router.push("/workflow/new")}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Workflow
                </button>
              )}
            </div>

            {hasWorkspace && (
              <>
                {/* Filter bar */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    {(
                      ["all", "ACTIVE", "DRAFT", "PAUSED"] as StatusFilter[]
                    ).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                        style={{
                          background:
                            statusFilter === s
                              ? "rgba(99,102,241,0.08)"
                              : "transparent",
                          borderColor:
                            statusFilter === s
                              ? "rgba(99,102,241,0.3)"
                              : "var(--border-subtle)",
                          color:
                            statusFilter === s
                              ? "#6366f1"
                              : "var(--text-muted)",
                        }}
                      >
                        {s === "all" ? "All workflows" : s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1" />

                  {/* Sort */}
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortBy)}
                      className="text-xs rounded-lg px-2 py-1.5 border bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                      style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                        background: "var(--input-bg)",
                      }}
                    >
                      <option value="updatedAt">Recently edited</option>
                      <option value="createdAt">Recently created</option>
                      <option value="name">Name</option>
                    </select>
                  </div>

                  {/* Search */}
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                    style={{
                      background: "var(--input-bg)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <Search
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search workflows..."
                      className="bg-transparent text-xs border-none outline-none w-44"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="flex items-center justify-center py-24">
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </div>
                ) : filtered.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                  >
                    <div
                      className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-4"
                      style={{
                        borderColor: "var(--border-subtle)",
                        background: "var(--bg-elevated)",
                      }}
                    >
                      <Workflow
                        className="w-6 h-6"
                        style={{ color: "var(--text-muted)" }}
                      />
                    </div>
                    <p
                      className="text-sm font-medium mb-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {search ? "No matching workflows" : "No workflows yet"}
                    </p>
                    <p
                      className="text-xs mb-5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {search
                        ? "Try a different search term"
                        : "Create your first workflow or start from a template."}
                    </p>
                    {!search && (
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => router.push("/workflow/new")}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Create Workflow
                        </button>
                        <button
                          onClick={() => setActiveTab("templates")}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border"
                          style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <LayoutTemplate className="w-4 h-4" />
                          Browse Templates
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    {/* Table header */}
                    <div
                      className="grid border-b px-4 py-2.5"
                      style={{
                        gridTemplateColumns: "1fr 110px 70px 60px 120px 110px 40px",
                        borderColor: "var(--border-subtle)",
                        background: "var(--bg-elevated)",
                      }}
                    >
                      {["Name", "Status", "Nodes", "Runs", "Last edited", "Created", ""].map(
                        (h) => (
                          <span
                            key={h}
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {h}
                          </span>
                        ),
                      )}
                    </div>

                    {/* Table rows */}
                    {filtered.map((wf, i) => {
                      const sc = STATUS_CONFIG[wf.status] || STATUS_CONFIG.DRAFT;
                      return (
                        <motion.div
                          key={wf.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="grid items-center px-4 py-3 border-b transition-colors cursor-pointer group"
                          style={{
                            gridTemplateColumns:
                              "1fr 110px 70px 60px 120px 110px 40px",
                            borderColor: "var(--border-subtle)",
                            background: "var(--bg-card)",
                          }}
                          onClick={() => router.push(`/workflow/${wf.id}`)}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "var(--bg-card)";
                          }}
                        >
                          {/* Name */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: "rgba(99,102,241,0.08)" }}
                            >
                              <Workflow className="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-sm font-medium truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {wf.name}
                              </p>
                              {wf.description && (
                                <p
                                  className="text-[11px] truncate"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  {wf.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Status */}
                          <div>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${sc.bg} ${sc.color}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                              />
                              {wf.status.charAt(0) +
                                wf.status.slice(1).toLowerCase()}
                            </span>
                          </div>

                          {/* Nodes */}
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {wf.nodes?.length || 0}
                          </span>

                          {/* Runs */}
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {wf._count?.runs || 0}
                          </span>

                          {/* Last edited */}
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {timeAgo(wf.updatedAt)}
                          </span>

                          {/* Created */}
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {timeAgo(wf.createdAt)}
                          </span>

                          {/* Actions */}
                          <div
                            className="relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                setRowMenuOpen(
                                  rowMenuOpen === wf.id ? null : wf.id,
                                )
                              }
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <AnimatePresence>
                              {rowMenuOpen === wf.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-full mt-1 w-40 rounded-xl border shadow-xl z-10 overflow-hidden"
                                  style={{
                                    background: "var(--bg-card)",
                                    borderColor: "var(--border-subtle)",
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      router.push(`/workflow/${wf.id}`)
                                    }
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      deleteWorkflow(wf.id, wf.name)
                                    }
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-red-500/10 transition-colors text-red-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ──── Templates Tab ──── */}
        {activeTab === "templates" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h1
                className="text-xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Templates
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Start from a pre-built workflow
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border p-5 transition-all hover:border-indigo-500/30 group"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {t.name}
                      </h3>
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t.nodes.length} nodes
                      </p>
                    </div>
                  </div>
                  <p
                    className="text-xs mb-4 leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {t.nodes.map((n, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {n.label}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => importTemplate(t)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                  >
                    Use Template
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ──── Settings Tab ──── */}
        {activeTab === "settings" && (
          <div className="max-w-lg">
            <h1
              className="text-xl font-semibold mb-6"
              style={{ color: "var(--text-primary)" }}
            >
              Settings
            </h1>
            <div className="space-y-4">
              <div
                className="rounded-2xl border p-5"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <h3
                  className="text-sm font-semibold mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  Appearance
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => theme !== "light" && toggleTheme()}
                    className="flex-1 flex flex-col items-center py-4 rounded-xl border text-sm font-medium transition-all"
                    style={{
                      borderColor:
                        theme === "light"
                          ? "#6366f1"
                          : "var(--border-subtle)",
                      background:
                        theme === "light"
                          ? "rgba(99,102,241,0.05)"
                          : "transparent",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Sun className="w-5 h-5 mb-2" />
                    Light
                  </button>
                  <button
                    onClick={() => theme !== "dark" && toggleTheme()}
                    className="flex-1 flex flex-col items-center py-4 rounded-xl border text-sm font-medium transition-all"
                    style={{
                      borderColor:
                        theme === "dark" ? "#6366f1" : "var(--border-subtle)",
                      background:
                        theme === "dark"
                          ? "rgba(99,102,241,0.05)"
                          : "transparent",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Moon className="w-5 h-5 mb-2" />
                    Dark
                  </button>
                </div>
              </div>

              <div
                className="rounded-2xl border p-5"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Account
                </h3>
                <p
                  className="text-xs mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  {typeof window !== "undefined"
                    ? JSON.parse(
                        localStorage.getItem("user") || '{"email":"dev@autochain.ai"}',
                      ).email
                    : "dev@autochain.ai"}
                </p>
                <button
                  onClick={() => {
                    localStorage.clear();
                    router.push("/login");
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:border-red-500/30 hover:text-red-400"
                  style={{
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {showCreateWs && (
        <CreateWorkspaceModal
          open={showCreateWs}
          onOpenChange={setShowCreateWs}
          onSuccess={() => refreshWorkspaces()}
        />
      )}
    </div>
  );
}
