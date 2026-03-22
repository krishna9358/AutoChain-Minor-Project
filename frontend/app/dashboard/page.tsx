"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TemplateLibrary, { type TemplatePreview } from "@/components/workflow/TemplateLibrary";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { useToast } from "@/components/hooks/use-toast";
import { workflowApi } from "@/lib/api";
import { useDashboardUI } from "@/components/dashboard/DashboardUIProvider";
import {
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
  ArrowRight,
  ScrollText,
  Building2,
  FolderPlus,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit2,
  Copy,
  Play,
  Sparkles,
  FlaskConical,
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
    id: "procurement",
    name: "Procurement to Payment",
    icon: "📋",
    description:
      "Automates purchasing — request form, budget approval, PO generation, and delivery tracking",
    nodes: [
      { nodeType: "form-input", label: "Purchase Request", category: "INPUT", config: {} },
      { nodeType: "ai-agent", label: "Validate & Categorize", category: "AI", config: {} },
      { nodeType: "if-condition", label: "Budget Check", category: "LOGIC", config: {} },
      { nodeType: "approval", label: "Manager Approval", category: "CONTROL", config: {} },
      { nodeType: "document-generator", label: "Create PO", category: "OUTPUT", config: {} },
      { nodeType: "task-assigner", label: "Assign Procurement", category: "CONTROL", config: {} },
      { nodeType: "sla-monitor", label: "Track Delivery", category: "CONTROL", config: {} },
      { nodeType: "audit-log", label: "Record Trail", category: "OUTPUT", config: {} },
    ],
  },
  {
    id: "onboarding",
    name: "Employee Onboarding",
    icon: "👋",
    description:
      "Streamlines new hire setup — accounts, tasks, welcome packet, and 30-day check-ins",
    nodes: [
      { nodeType: "form-input", label: "New Hire Details", category: "INPUT", config: {} },
      { nodeType: "ai-agent", label: "Onboarding Plan", category: "AI", config: {} },
      { nodeType: "task-assigner", label: "IT Setup Tasks", category: "CONTROL", config: {} },
      { nodeType: "task-assigner", label: "HR Paperwork", category: "CONTROL", config: {} },
      { nodeType: "document-generator", label: "Welcome Packet", category: "OUTPUT", config: {} },
      { nodeType: "email-send", label: "Welcome Email", category: "INTEGRATION", config: {} },
      { nodeType: "sla-monitor", label: "30-Day Check-in", category: "CONTROL", config: {} },
      { nodeType: "audit-log", label: "Log Onboarding", category: "OUTPUT", config: {} },
    ],
  },
  {
    id: "contract",
    name: "Contract Lifecycle",
    icon: "📝",
    description:
      "Manages contracts end-to-end — AI drafts, legal reviews, signature tracking, escalation",
    nodes: [
      { nodeType: "form-input", label: "Contract Details", category: "INPUT", config: {} },
      { nodeType: "ai-agent", label: "Draft Contract", category: "AI", config: {} },
      { nodeType: "document-generator", label: "Contract PDF", category: "OUTPUT", config: {} },
      { nodeType: "approval", label: "Legal Review", category: "CONTROL", config: {} },
      { nodeType: "email-send", label: "Send for Signature", category: "INTEGRATION", config: {} },
      { nodeType: "sla-monitor", label: "Signature Deadline", category: "CONTROL", config: {} },
      { nodeType: "escalation", label: "Overdue Alert", category: "CONTROL", config: {} },
      { nodeType: "audit-log", label: "Record Decisions", category: "OUTPUT", config: {} },
    ],
  },
  {
    id: "meeting",
    name: "Meeting Intelligence",
    icon: "🎤",
    description:
      "Turns meetings into action — extracts decisions, assigns tasks, tracks completion",
    nodes: [
      { nodeType: "entry-point", label: "Meeting Transcript", category: "INPUT", config: {} },
      { nodeType: "ai-agent", label: "Extract Decisions", category: "AI", config: {} },
      { nodeType: "ai-agent", label: "Find Action Items", category: "AI", config: {} },
      { nodeType: "task-assigner", label: "Assign Tasks", category: "CONTROL", config: {} },
      { nodeType: "slack-send", label: "Share Summary", category: "INTEGRATION", config: {} },
      { nodeType: "sla-monitor", label: "Track Completion", category: "CONTROL", config: {} },
      { nodeType: "audit-log", label: "Log Meeting", category: "OUTPUT", config: {} },
    ],
  },
  {
    id: "multi-agent",
    name: "Multi-Agent Collaboration",
    icon: "🤖",
    description:
      "Multiple AI agents collaborate — plan, research, analyze, decide, and execute tasks",
    nodes: [
      { nodeType: "entry-point", label: "Task Input", category: "INPUT", config: {} },
      { nodeType: "ai-agent", label: "Task Planner", category: "AI", config: {} },
      { nodeType: "data-enrichment", label: "Data Retrieval", category: "AI", config: {} },
      { nodeType: "ai-agent", label: "Analysis Agent", category: "AI", config: {} },
      { nodeType: "ai-agent", label: "Decision Agent", category: "AI", config: {} },
      { nodeType: "approval", label: "Human Review", category: "CONTROL", config: {} },
      { nodeType: "document-generator", label: "Final Report", category: "OUTPUT", config: {} },
      { nodeType: "audit-log", label: "Decision Trail", category: "OUTPUT", config: {} },
    ],
  },
  {
    id: "health-monitor",
    name: "Workflow Health Monitor",
    icon: "🏥",
    description:
      "Monitors workflows — catches drift, predicts bottlenecks, escalates before SLA breaches",
    nodes: [
      { nodeType: "entry-point", label: "Scheduled Check", category: "INPUT", config: {} },
      { nodeType: "http-request", label: "Fetch Metrics", category: "INTEGRATION", config: {} },
      { nodeType: "ai-agent", label: "Analyze Health", category: "AI", config: {} },
      { nodeType: "if-condition", label: "Issues Found?", category: "LOGIC", config: {} },
      { nodeType: "sla-monitor", label: "Check SLAs", category: "CONTROL", config: {} },
      { nodeType: "escalation", label: "Critical Alert", category: "CONTROL", config: {} },
      { nodeType: "slack-send", label: "Health Report", category: "INTEGRATION", config: {} },
      { nodeType: "audit-log", label: "Log Results", category: "OUTPUT", config: {} },
    ],
  },
  {
    id: "support",
    name: "Customer Support",
    icon: "🎫",
    description:
      "AI-powered support — classifies tickets, drafts responses, tracks resolution SLAs",
    nodes: [
      { nodeType: "entry-point", label: "New Ticket", category: "INPUT", config: {} },
      { nodeType: "ai-agent", label: "Classify Issue", category: "AI", config: {} },
      { nodeType: "data-enrichment", label: "Customer History", category: "AI", config: {} },
      { nodeType: "ai-agent", label: "Draft Response", category: "AI", config: {} },
      { nodeType: "approval", label: "Review Response", category: "CONTROL", config: {} },
      { nodeType: "email-send", label: "Send Reply", category: "INTEGRATION", config: {} },
      { nodeType: "sla-monitor", label: "Resolution Timer", category: "CONTROL", config: {} },
      { nodeType: "audit-log", label: "Log Activity", category: "OUTPUT", config: {} },
    ],
  },
  {
    id: "incident",
    name: "Incident Management",
    icon: "🚨",
    description:
      "Handles incidents end-to-end — severity analysis, responder assignment, postmortem",
    nodes: [
      { nodeType: "entry-point", label: "Alert Received", category: "INPUT", config: {} },
      { nodeType: "ai-agent", label: "Analyze Severity", category: "AI", config: {} },
      { nodeType: "escalation", label: "Critical Escalation", category: "CONTROL", config: {} },
      { nodeType: "task-assigner", label: "Assign Responder", category: "CONTROL", config: {} },
      { nodeType: "slack-send", label: "Incident Channel", category: "INTEGRATION", config: {} },
      { nodeType: "sla-monitor", label: "Resolution SLA", category: "CONTROL", config: {} },
      { nodeType: "document-generator", label: "Incident Report", category: "OUTPUT", config: {} },
      { nodeType: "audit-log", label: "Log Incident", category: "OUTPUT", config: {} },
    ],
  },
  {
    id: "sales",
    name: "Sales Outreach",
    icon: "🎯",
    description:
      "Qualifies leads — enriches data, scores quality, personalizes outreach, tracks follow-ups",
    nodes: [
      { nodeType: "entry-point", label: "New Lead", category: "INPUT", config: {} },
      { nodeType: "data-enrichment", label: "Company Data", category: "AI", config: {} },
      { nodeType: "ai-agent", label: "Score Lead", category: "AI", config: {} },
      { nodeType: "if-condition", label: "Qualified?", category: "LOGIC", config: {} },
      { nodeType: "ai-agent", label: "Personalize Email", category: "AI", config: {} },
      { nodeType: "approval", label: "Review Outreach", category: "CONTROL", config: {} },
      { nodeType: "email-send", label: "Send Email", category: "INTEGRATION", config: {} },
      { nodeType: "audit-log", label: "Log Activity", category: "OUTPUT", config: {} },
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

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const {
    activeWorkspace,
    hasWorkspace,
    loading: wsLoading,
    refreshWorkspaces,
  } = useWorkspace();
  const { toast } = useToast();
  const { openCreateWorkspace } = useDashboardUI();

  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("workflows");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [rowMenuOpen, setRowMenuOpen] = useState<string | null>(null);
  const [yamlTemplates, setYamlTemplates] = useState<TemplatePreview[]>([]);

  // Load YAML templates from API
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setYamlTemplates(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rowMenuOpen) setRowMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [rowMenuOpen]);

  useEffect(() => {
    if (searchParams.get("view") === "settings") {
      setActiveTab("settings");
    }
  }, [searchParams]);

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
      openCreateWorkspace();
      return;
    }
    const ts = Date.now();
    const nodes = template.nodes.map((n, i) => ({
      id: `${n.nodeType}-${ts}-${i}`,
      type: "workflowNode",
      position: { x: 250 + i * 280, y: 200 + (i % 2 === 0 ? 0 : 60) },
      data: {
        ...n,
        componentId: n.nodeType,
      },
    }));
    const edges = nodes.slice(0, -1).map((n, i) => ({
      id: `e-${ts}-${i}`,
      source: n.id,
      target: nodes[i + 1].id,
      animated: true,
      style: { stroke: "#6366f1", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed", color: "#6366f1" },
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
    <>
      <nav
        className="sticky top-0 z-20 flex items-center justify-center gap-1 h-11 px-4 border-b"
        style={{
          background: "var(--bg-primary)",
          borderColor: "var(--border-subtle)",
        }}
        aria-label="Dashboard sections"
      >
        {(["workflows", "templates", "settings"] as TabId[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              router.replace("/dashboard", { scroll: false });
            }}
            className="relative px-4 h-11 text-sm font-medium transition-colors capitalize"
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
                layoutId="dashboard-main-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full"
              />
            )}
          </button>
        ))}
      </nav>

      <main className="px-6 py-6 max-w-[1400px] w-full mx-auto">
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
              onClick={() => openCreateWorkspace()}
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
                {/* Demo workflow quick-launch banner */}
                {(() => {
                  const demo = workflows.find((w) =>
                    w.name === "Support Ticket Triage AI",
                  );
                  if (!demo) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-4 mb-5 p-4 rounded-2xl border"
                      style={{
                        background: "rgba(99,102,241,0.04)",
                        borderColor: "rgba(99,102,241,0.2)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(99,102,241,0.12)" }}
                      >
                        <FlaskConical className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            Demo Workflow Ready
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-500">
                            DEMO
                          </span>
                        </div>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                            {demo.name}
                          </span>{" "}
                          — 5-node AI pipeline: webhook trigger → extract ticket info →
                          classify issue type → generate reply → send email. Click{" "}
                          <strong>Open</strong> to explore, then hit{" "}
                          <strong>Run</strong> to execute end-to-end.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => router.push(`/workflow/${demo.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-white/5"
                          style={{
                            borderColor: "rgba(99,102,241,0.3)",
                            color: "#6366f1",
                          }}
                        >
                          Open
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => router.push(`/workflow/${demo.id}?tab=runs`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Run Demo
                        </button>
                      </div>
                    </motion.div>
                  );
                })()}

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
                    className="rounded-xl border overflow-visible"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    {/* Table header */}
                    <div
                      className="grid border-b px-4 py-2.5 rounded-t-xl"
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
                      const isLast = i === filtered.length - 1;
                      return (
                        <motion.div
                          key={wf.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className={`grid items-center px-4 py-3 transition-colors cursor-pointer group ${
                            isLast ? "rounded-b-xl border-b-0" : "border-b"
                          }`}
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
                              <div className="flex items-center gap-1.5">
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {wf.name}
                                </p>
                                {wf.name === "Support Ticket Triage AI" && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-indigo-500/10 text-indigo-500">
                                    DEMO
                                  </span>
                                )}
                              </div>
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

                          {/* Actions — overflow-visible + high z-index so menu isn’t clipped by table */}
                          <div
                            className="relative z-20 overflow-visible"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
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
                                  className="absolute right-0 top-full mt-1 w-40 rounded-xl border shadow-2xl z-[200] overflow-hidden"
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
            {/* YAML Template Library with Import/Export */}
            {yamlTemplates.length > 0 && (
              <div className="mb-10">
                <TemplateLibrary
                  templates={yamlTemplates}
                  onSelectTemplate={(tpl) => {
                    if (!hasWorkspace) {
                      toast({ title: "Workspace required", description: "Create a workspace first.", variant: "destructive" });
                      openCreateWorkspace();
                      return;
                    }
                    const ts = Date.now();
                    // Build a map from YAML node IDs to new IDs
                    const idMap: Record<string, string> = {};
                    const nodes = tpl.nodes.map((n, i) => {
                      const newId = `${n.type}-${ts}-${i}`;
                      idMap[n.id] = newId;
                      return {
                        id: newId,
                        type: "workflowNode",
                        position: n.position || { x: 250 + i * 280, y: 200 },
                        data: {
                          nodeType: n.type,
                          componentId: n.type,
                          label: n.name,
                          description: n.description,
                          category: n.type,
                          config: n.config || {},
                        },
                      };
                    });
                    const edges = tpl.edges.map((e, i) => ({
                      id: `e-${ts}-${i}`,
                      source: idMap[e.source] || e.source,
                      target: idMap[e.target] || e.target,
                      animated: true,
                      style: { stroke: "#6366f1", strokeWidth: 2 },
                      markerEnd: { type: "arrowclosed", color: "#6366f1" },
                      label: e.label || "",
                    }));
                    sessionStorage.setItem("template-import", JSON.stringify({
                      name: tpl.name,
                      description: tpl.description,
                      nodes,
                      edges,
                    }));
                    router.push("/workflow/new?from=template");
                  }}
                  onImportTemplate={(tpl) => {
                    setYamlTemplates((prev) => {
                      if (prev.find((t) => t.id === tpl.id)) return prev;
                      return [...prev, tpl];
                    });
                    toast({ title: "Template imported", description: `"${tpl.name}" added to your library.` });
                  }}
                />
              </div>
            )}

            {/* Quick-Start Templates */}
            <div className="flex items-center justify-between mb-5">
              <h1
                className="text-xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Quick-Start Templates
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Click to instantly create a workflow
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
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center py-24"
          style={{ color: "var(--text-muted)" }}
        >
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
