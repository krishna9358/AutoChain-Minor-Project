"use client";

import { useEffect, useState, useCallback } from "react";
import { NodeConfigForm } from "@/components/workflow/forms/NodeConfigForm";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import { BACKEND_URL } from "@/app/config";
import { useTheme } from "@/components/ThemeProvider";
import { RunsPanel } from "@/components/workflow/runs/RunsPanel";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  X,
  Play,
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Activity,
  Bot,
  Brain,
  Globe,
  Mail,
  MessageSquare,
  Database,
  GitBranch,
  Shield,
  RotateCcw,
  FileText,
  Settings,
  ChevronRight,
  Timer,
  Workflow,
  Sun,
  Moon,
  Key,
  Link2,
  PanelLeftClose,
  PanelLeft,
  Pause,
  Search,
} from "lucide-react";
import type {
  Node,
  Edge,
  NodeProps,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from "@xyflow/react";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const DEV_TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN || "dev-demo-token";

// ─── Node Registry ──────────────────────────────────────────
const NODE_CFG: Record<
  string,
  { icon: any; color: string; label: string; cat: string }
> = {
  WEBHOOK_TRIGGER: {
    icon: Globe,
    color: "#f59e0b",
    label: "Webhook",
    cat: "TRIGGER",
  },
  SCHEDULE_TRIGGER: {
    icon: Clock,
    color: "#f59e0b",
    label: "Schedule",
    cat: "TRIGGER",
  },
  FILE_UPLOAD_TRIGGER: {
    icon: FileText,
    color: "#f59e0b",
    label: "File Upload",
    cat: "TRIGGER",
  },
  API_TRIGGER: {
    icon: Globe,
    color: "#f59e0b",
    label: "API Trigger",
    cat: "TRIGGER",
  },
  EXTRACTION_AGENT: {
    icon: Brain,
    color: "#6366f1",
    label: "Extraction",
    cat: "AI_AGENT",
  },
  SUMMARIZATION_AGENT: {
    icon: FileText,
    color: "#6366f1",
    label: "Summarizer",
    cat: "AI_AGENT",
  },
  CLASSIFICATION_AGENT: {
    icon: GitBranch,
    color: "#8b5cf6",
    label: "Classifier",
    cat: "AI_AGENT",
  },
  REASONING_AGENT: {
    icon: Brain,
    color: "#7c3aed",
    label: "Reasoning",
    cat: "AI_AGENT",
  },
  DECISION_AGENT: {
    icon: GitBranch,
    color: "#6366f1",
    label: "Decision",
    cat: "AI_AGENT",
  },
  VERIFICATION_AGENT: {
    icon: Shield,
    color: "#10b981",
    label: "Verification",
    cat: "AI_AGENT",
  },
  COMPLIANCE_AGENT: {
    icon: Shield,
    color: "#3b82f6",
    label: "Compliance",
    cat: "AI_AGENT",
  },
  IF_CONDITION: {
    icon: GitBranch,
    color: "#06b6d4",
    label: "If/Else",
    cat: "LOGIC",
  },
  LOOP: { icon: RotateCcw, color: "#06b6d4", label: "Loop", cat: "LOGIC" },
  PARALLEL: {
    icon: Activity,
    color: "#06b6d4",
    label: "Parallel",
    cat: "LOGIC",
  },
  SLACK_SEND: {
    icon: MessageSquare,
    color: "#10b981",
    label: "Slack",
    cat: "ACTION",
  },
  EMAIL_SEND: { icon: Mail, color: "#3b82f6", label: "Email", cat: "ACTION" },
  HTTP_REQUEST: { icon: Globe, color: "#10b981", label: "HTTP", cat: "ACTION" },
  API_CALL: { icon: Globe, color: "#14b8a6", label: "API Call", cat: "ACTION" },
  DB_WRITE: {
    icon: Database,
    color: "#f97316",
    label: "Database",
    cat: "ACTION",
  },
  DELAY: { icon: Timer, color: "#6b7280", label: "Delay", cat: "CONTROL" },
  APPROVAL: {
    icon: Pause,
    color: "#eab308",
    label: "Approval",
    cat: "CONTROL",
  },
  RETRY: { icon: RotateCcw, color: "#6b7280", label: "Retry", cat: "CONTROL" },
  ERROR_HANDLER: {
    icon: AlertCircle,
    color: "#ef4444",
    label: "Error Handler",
    cat: "CONTROL",
  },
};

// ─── Custom Node (minimalist, with open/close ports) ─────
function FlowNode({ data, isConnectable }: NodeProps) {
  const cfg = NODE_CFG[data.nodeType as string] || {
    icon: Zap,
    color: "#6b7280",
    label: "Node",
    cat: "ACTION",
  };
  const Icon = cfg.icon;
  const isRunning = data.runStatus === "RUNNING";
  const isCompleted = data.runStatus === "COMPLETED";
  const isFailed = data.runStatus === "FAILED";

  return (
    <div
      className="rounded-xl border bg-white dark:bg-[#1a1a24] transition-all w-[200px]"
      style={{
        borderColor: data.selected
          ? "#6366f1"
          : isRunning
            ? "#3b82f6"
            : isCompleted
              ? "#10b981"
              : isFailed
                ? "#ef4444"
                : "var(--border-medium)",
        boxShadow: data.selected
          ? "0 0 0 2px rgba(99,102,241,0.2)"
          : isRunning
            ? "0 0 12px rgba(59,130,246,0.3)"
            : "none",
      }}
    >
      {/* Target handle — visible on hover */}
      {cfg.cat !== "TRIGGER" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !border-2 !rounded-full !opacity-0 hover:!opacity-100 transition-opacity"
          style={{ background: cfg.color, borderColor: "var(--bg-card)" }}
          isConnectable={isConnectable}
        />
      )}
      <div className="p-3 flex items-center space-x-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {(data.label as string) || cfg.label}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {cfg.cat.replace("_", " ")}
          </p>
        </div>
        {isCompleted && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        )}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
        {isRunning && (
          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
        )}
      </div>
      {/* Source handle — visible on hover */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !border-2 !rounded-full !opacity-0 hover:!opacity-100 transition-opacity"
        style={{ background: cfg.color, borderColor: "var(--bg-card)" }}
        isConnectable={isConnectable}
      />
    </div>
  );
}

const nodeTypes = { workflowNode: FlowNode };

// Templates
const TEMPLATES = [
  {
    id: "meeting",
    name: "Meeting Intelligence",
    icon: "🎤",
    prompt:
      "Process meeting transcripts, extract action items, classify priority, send to Slack",
  },
  {
    id: "support",
    name: "Support Ticket AI",
    icon: "🎫",
    prompt:
      "Classify support tickets, generate AI responses, escalate to managers",
  },
  {
    id: "sales",
    name: "Lead Qualification",
    icon: "🎯",
    prompt: "Qualify sales leads, score them, route to reps, send outreach",
  },
  {
    id: "invoice",
    name: "Invoice Processing",
    icon: "📄",
    prompt: "Process invoices, extract data, validate, route for approval",
  },
  {
    id: "onboarding",
    name: "Employee Onboarding",
    icon: "👋",
    prompt:
      "Automate onboarding with IT provisioning, welcome emails, Slack intros",
  },
  {
    id: "incident",
    name: "Incident Response",
    icon: "🚨",
    prompt: "Classify alert severity, analyze root cause, notify stakeholders",
  },
];

// ─── Main Component ─────────────────────────────────────────
function WorkflowInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const wfId = params?.id as string;
  const isNew = wfId === "new";

  const [leftTab, setLeftTab] = useState<"ai" | "nodes" | "settings">(
    isNew ? "ai" : "nodes",
  );
  const [activeMode, setActiveMode] = useState<"design" | "runs" | "logs">(
    (searchParams?.get("tab") as any) || "design",
  );
  const [leftOpen, setLeftOpen] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [wfName, setWfName] = useState("Untitled Workflow");
  const [wfDesc, setWfDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [selNode, setSelNode] = useState<Node | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [activeRun, setActiveRun] = useState<any>(null);
  const [runSteps, setRunSteps] = useState<any[]>([]);
  const [allRunsLoading, setAllRunsLoading] = useState(false);
  const [selStep, setSelStep] = useState<any>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGen, setAiGen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const { screenToFlowPosition } = useReactFlow();

  const onNC: OnNodesChange = useCallback(
    (c) => setNodes((n) => applyNodeChanges(c, n)),
    [],
  );
  const onEC: OnEdgesChange = useCallback(
    (c) => setEdges((e) => applyEdgeChanges(c, e)),
    [],
  );
  const onCon: OnConnect = useCallback(
    (p) =>
      setEdges((e) =>
        addEdge(
          {
            ...p,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#6366f1",
              width: 16,
              height: 16,
            },
          },
          e,
        ),
      ),
    [],
  );

  const token = () =>
    IS_DEV
      ? DEV_TOKEN
      : typeof window !== "undefined"
        ? localStorage.getItem("token")
        : null;

  // Load localStorage values once on mount
  useEffect(() => {
    const k = localStorage.getItem("agentflow-api-key");
    if (k) setApiKey(k);
    const w = localStorage.getItem("agentflow-webhook-url");
    if (w) setWebhookUrl(w);
  }, []);

  // Load workflow when wfId changes
  useEffect(() => {
    if (!isNew) {
      const loadWorkflow = async () => {
        try {
          const r = await axios.get(`${BACKEND_URL}/api/v1/workflows/${wfId}`, {
            headers: { Authorization: token()! },
          });
          const d = r.data;
          setWfName(d.name);
          setWfDesc(d.description || "");
          setRuns(d.runs || []);
          setNodes(
            (d.nodes || []).map((n: any) => ({
              id: n.id,
              type: "workflowNode",
              position: n.position || { x: 300, y: 0 },
              data: {
                nodeType: n.nodeType,
                category: n.category,
                label: n.label,
                config: n.config,
              },
            })),
          );
          setEdges(
            (d.edges || []).map((e: any) => ({
              id: e.id,
              source: e.sourceNodeId,
              target: e.targetNodeId,
              animated: true,
              style: { stroke: "#6366f1", strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
            })),
          );
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      loadWorkflow();
    }
  }, [wfId, isNew]);

  const save = async () => {
    setSaving(true);
    try {
      const p = {
        name: wfName,
        description: wfDesc,
        nodes: nodes.map((n) => ({
          id: n.id,
          nodeType: n.data.nodeType,
          category: n.data.category || NODE_CFG[n.data.nodeType as string]?.cat,
          label: n.data.label || NODE_CFG[n.data.nodeType as string]?.label,
          config: n.data.config || {},
          position: n.position,
          metadata: {},
        })),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
      };
      if (isNew) {
        const r = await axios.post(`${BACKEND_URL}/api/v1/workflows`, p, {
          headers: { Authorization: token()! },
        });
        router.push(`/workflow/${r.data.id}`);
      } else
        await axios.put(`${BACKEND_URL}/api/v1/workflows/${wfId}`, p, {
          headers: { Authorization: token()! },
        });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const exec = async () => {
    if (isNew) return;
    setExecuting(true);
    try {
      const r = await axios.post(
        `${BACKEND_URL}/api/v1/execution/run/${wfId}`,
        {},
        { headers: { Authorization: token()! } },
      );
      setActiveMode("runs");
      poll(r.data.id);
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  const poll = async (id: string) => {
    const go = async () => {
      try {
        const r = await axios.get(`${BACKEND_URL}/api/v1/execution/run/${id}`, {
          headers: { Authorization: token()! },
        });
        setActiveRun(r.data);
        setRunSteps(r.data.steps || []);
        const m = new Map(r.data.steps.map((s: any) => [s.nodeId, s.status]));
        setNodes((n) =>
          n.map((nd) => ({
            ...nd,
            data: { ...nd.data, runStatus: m.get(nd.id) || null },
          })),
        );
        if (["RUNNING", "PENDING", "WAITING_APPROVAL"].includes(r.data.status))
          setTimeout(go, 1500);
      } catch {}
    };
    go();
  };

  const aiGenerate = async (p?: string) => {
    const prompt = p || aiPrompt;
    if (!prompt.trim()) return;
    setAiGen(true);
    try {
      const r = await axios.post(
        `${BACKEND_URL}/api/v1/generate/workflow`,
        { prompt },
        { headers: { Authorization: token()! } },
      );
      const g = r.data;
      setWfName(g.name);
      setWfDesc(g.description);
      setNodes(
        g.nodes.map((n: any) => ({
          id: n.tempId,
          type: "workflowNode",
          position: n.position,
          data: {
            nodeType: n.nodeType,
            category: n.category,
            label: n.label,
            config: n.config,
          },
        })),
      );
      setEdges(
        g.edges.map((e: any, i: number) => ({
          id: `e-${i}`,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
        })),
      );
      setLeftTab("nodes");
    } catch (e) {
      console.error(e);
    } finally {
      setAiGen(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const t = e.dataTransfer.getData("nodeType");
      if (!t) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const c = NODE_CFG[t];
      setNodes((n) => [
        ...n,
        {
          id: `${t}-${Date.now()}`,
          type: "workflowNode",
          position: pos,
          data: { nodeType: t, category: c?.cat, label: c?.label, config: {} },
        },
      ]);
    },
    [screenToFlowPosition],
  );

  if (loading)
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    );

  const SD: Record<string, string> = {
    COMPLETED: "bg-emerald-500",
    FAILED: "bg-red-500",
    RUNNING: "bg-blue-500",
    PENDING: "bg-zinc-400",
    WAITING_APPROVAL: "bg-amber-500",
  };

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ─── Top Bar ──── */}
      <header
        className="flex items-center justify-between px-3 py-2 border-b z-30"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-px h-5"
            style={{ background: "var(--border-subtle)" }}
          />
          <input
            value={wfName}
            onChange={(e) => setWfName(e.target.value)}
            className="text-sm font-medium bg-transparent border-none outline-none w-48"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        <div
          className="flex items-center space-x-0.5 rounded-lg p-0.5 border"
          style={{
            background: "var(--bg-hover)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {(["design", "runs", "logs"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveMode(t)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all capitalize"
              style={{
                background:
                  activeMode === t ? "var(--bg-active)" : "transparent",
                color:
                  activeMode === t
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg"
            style={{ color: "var(--text-muted)" }}
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium border"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span>Save</span>
          </button>
          <button
            onClick={exec}
            disabled={executing || isNew}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
          >
            {executing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            <span>Run</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ─── Left Panel ──── */}
        {activeMode === "design" && leftOpen && (
          <div
            className="flex border-r"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {/* Tab icons */}
            <div
              className="w-10 flex flex-col items-center py-2 space-y-0.5 border-r"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              {[
                { id: "ai" as const, icon: Sparkles, tip: "AI" },
                { id: "nodes" as const, icon: Plus, tip: "Nodes" },
                { id: "settings" as const, icon: Settings, tip: "Settings" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setLeftTab(t.id)}
                  title={t.tip}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background:
                      leftTab === t.id ? "rgba(99,102,241,0.1)" : "transparent",
                    color: leftTab === t.id ? "#6366f1" : "var(--text-muted)",
                  }}
                >
                  <t.icon className="w-3.5 h-3.5" />
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => setLeftOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: "var(--text-muted)" }}
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Panel content */}
            <div
              className="w-60 overflow-y-auto"
              style={{ background: "var(--bg-secondary)" }}
            >
              {leftTab === "ai" && (
                <div className="p-3 space-y-3">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    AI Generator
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe your workflow..."
                    rows={3}
                    className="w-full p-2.5 rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <button
                    onClick={() => aiGenerate()}
                    disabled={aiGen || !aiPrompt.trim()}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                  >
                    {aiGen ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>{aiGen ? "Generating..." : "Generate"}</span>
                  </button>
                  <div className="pt-1 space-y-1">
                    <p
                      className="text-[10px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Quick
                    </p>
                    {[
                      "Process meeting transcripts and extract tasks",
                      "Classify support tickets and auto-respond",
                      "Process invoices and route for approval",
                    ].map((p, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setAiPrompt(p);
                          aiGenerate(p);
                        }}
                        className="w-full text-left text-[11px] p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--text-muted)" }}
                      >
                        &ldquo;{p}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {leftTab === "nodes" && (
                <div className="p-2">
                  {Object.entries(
                    Object.entries(NODE_CFG).reduce(
                      (a, [k, v]) => {
                        if (!a[v.cat]) a[v.cat] = [];
                        a[v.cat].push({ key: k, ...v });
                        return a;
                      },
                      {} as Record<string, any[]>,
                    ),
                  ).map(([cat, items]) => (
                    <div key={cat} className="mb-3">
                      <p
                        className="text-[10px] font-medium uppercase tracking-wider mb-1 px-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {cat.replace("_", " ")}
                      </p>
                      {items.map((it: any) => (
                        <div
                          key={it.key}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("nodeType", it.key);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className="flex items-center space-x-2 p-1.5 mb-0.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors group"
                        >
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${it.color}15`,
                              color: it.color,
                            }}
                          >
                            <it.icon className="w-3 h-3" />
                          </div>
                          <span
                            className="text-[11px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {it.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {leftTab === "settings" && (
                <div className="p-3 space-y-4">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Settings
                  </p>
                  <div>
                    <label
                      className="text-[10px] font-medium flex items-center space-x-1 mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Key className="w-3 h-3" />
                      <span>API Key</span>
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-[10px] font-medium flex items-center space-x-1 mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Link2 className="w-3 h-3" />
                      <span>Webhook URL</span>
                    </label>
                    <input
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem("agentflow-api-key", apiKey);
                      localStorage.setItem("agentflow-webhook-url", webhookUrl);
                    }}
                    className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed left toggle */}
        {activeMode === "design" && !leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            className="absolute left-2 top-16 z-20 p-1.5 rounded-lg border shadow-sm"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* ─── Main Area ──── */}
        <div className="flex-1 relative">
          {activeMode === "design" && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNC}
              onEdgesChange={onEC}
              onConnect={onCon}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              onNodeClick={(_, n) => setSelNode(n)}
              onPaneClick={() => setSelNode(null)}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.2}
              maxZoom={2.5}
              connectionLineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: "#6366f1", strokeWidth: 2 },
              }}
            >
              <Background
                color={theme === "dark" ? "#222" : "#e2e8f0"}
                gap={24}
                size={1}
              />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={() => "#6366f1"}
                maskColor={
                  theme === "dark"
                    ? "rgba(0,0,0,0.85)"
                    : "rgba(255,255,255,0.85)"
                }
              />
            </ReactFlow>
          )}

          {activeMode === "runs" && (
            <RunsPanel
              runs={runs.map((r: any) => ({
                ...r,
                workflowName: wfName,
                steps: activeRun?.id === r.id ? runSteps : [],
              }))}
              activeRun={
                activeRun
                  ? { ...activeRun, workflowName: wfName, steps: runSteps }
                  : undefined
              }
              onRunSelect={(run) => {
                setActiveRun(run);
                poll(run.id);
              }}
              onRefresh={async () => {
                if (!isNew) {
                  setAllRunsLoading(true);
                  try {
                    const r = await axios.get(
                      `${BACKEND_URL}/api/v1/workflows/${wfId}`,
                      {
                        headers: { Authorization: token()! },
                      },
                    );
                    setRuns(r.data.runs || []);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setAllRunsLoading(false);
                  }
                }
              }}
              loading={allRunsLoading}
            />
          )}

          {activeMode === "logs" && (
            <div className="h-full overflow-y-auto p-5">
              {!activeRun ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <FileText
                    className="w-8 h-8 mb-2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    No logs yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {runSteps.map((s: any, i: number) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--bg-card)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className="text-[10px] font-mono"
                            style={{ color: "var(--text-muted)" }}
                          >
                            #{i + 1}
                          </span>
                          <span
                            className="text-xs font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {s.node?.label}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500" : s.status === "FAILED" ? "bg-red-500/10 text-red-500" : "bg-zinc-500/10 text-zinc-500"}`}
                          >
                            {s.status}
                          </span>
                        </div>
                        {s.executionTimeMs && (
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {s.executionTimeMs}ms
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p
                            className="text-[10px] mb-0.5"
                            style={{ color: "var(--text-muted)" }}
                          >
                            In
                          </p>
                          <pre
                            className="p-1.5 rounded text-[10px] font-mono max-h-20 overflow-auto"
                            style={{
                              background: "var(--code-bg)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {s.inputPayload
                              ? JSON.stringify(s.inputPayload, null, 2)
                              : "—"}
                          </pre>
                        </div>
                        <div>
                          <p
                            className="text-[10px] mb-0.5"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Out
                          </p>
                          <pre
                            className="p-1.5 rounded text-[10px] font-mono max-h-20 overflow-auto text-emerald-500"
                            style={{ background: "var(--code-bg)" }}
                          >
                            {s.outputPayload
                              ? JSON.stringify(s.outputPayload, null, 2)
                              : "—"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Right Config ──── */}
        <AnimatePresence>
          {selNode && activeMode === "design" && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 260 }}
              exit={{ width: 0 }}
              className="border-l overflow-hidden"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="w-[260px] p-3 h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Properties
                  </p>
                  <button
                    onClick={() => setSelNode(null)}
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label
                      className="text-[10px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Label
                    </label>
                    <input
                      value={(selNode.data.label as string) || ""}
                      onChange={(e) =>
                        setNodes((n) =>
                          n.map((nd) =>
                            nd.id === selNode.id
                              ? {
                                  ...nd,
                                  data: { ...nd.data, label: e.target.value },
                                }
                              : nd,
                          ),
                        )
                      }
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-[10px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Type
                    </label>
                    <p className="mt-1 text-xs text-indigo-500">
                      {selNode.data.nodeType as string}
                    </p>
                  </div>
                  <div>
                    <label
                      className="text-[10px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Configuration
                    </label>
                    <div className="mt-1">
                      <NodeConfigForm
                        nodeType={selNode.data.nodeType as string}
                        config={selNode.data.config || {}}
                        onChange={(config) =>
                          setNodes((n) =>
                            n.map((nd) =>
                              nd.id === selNode.id
                                ? { ...nd, data: { ...nd.data, config } }
                                : nd,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNodes((n) => n.filter((nd) => nd.id !== selNode.id));
                      setEdges((e) =>
                        e.filter(
                          (ed) =>
                            ed.source !== selNode.id &&
                            ed.target !== selNode.id,
                        ),
                      );
                      setSelNode(null);
                    }}
                    className="w-full py-2 rounded-lg text-xs font-medium border hover:bg-red-500/10 transition-all"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Delete Node
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <ReactFlowProvider>
      <WorkflowInner />
    </ReactFlowProvider>
  );
}
