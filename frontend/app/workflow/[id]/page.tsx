"use client";

import { useEffect, useState, useCallback } from "react";
import { NodeConfigForm } from "@/components/workflow/forms/NodeConfigForm";
import {
  fetchComponentCatalog,
  getConfigDefaults,
  groupComponentsByCategory,
  validateNodeConfig,
  categoryLabel,
  type ComponentDefinition,
  type ComponentCategory,
} from "@/components/workflow/config/componentCatalog";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { BACKEND_URL } from "@/app/config";
import { useTheme } from "@/components/ThemeProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { RunsPanel } from "@/components/workflow/runs/RunsPanel";
import { api } from "@/lib/api";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { useToast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  Timer,
  Workflow,
  Sun,
  Moon,
  Key,
  Link2,
  PanelLeftClose,
  PanelLeft,
  Pause,
  FolderPlus,
  Building2,
  ChevronsUpDown,
  Check,
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
const LEGACY_NODE_CFG: Record<
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
  HTTP_REQUEST: {
    icon: Globe,
    color: "#10b981",
    label: "HTTP",
    cat: "ACTION",
  },
  API_CALL: {
    icon: Globe,
    color: "#14b8a6",
    label: "API Call",
    cat: "ACTION",
  },
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
  RETRY: {
    icon: RotateCcw,
    color: "#6b7280",
    label: "Retry",
    cat: "CONTROL",
  },
  ERROR_HANDLER: {
    icon: AlertCircle,
    color: "#ef4444",
    label: "Error Handler",
    cat: "CONTROL",
  },
};

// ─── Custom Node ─────
function FlowNode({ data, isConnectable }: NodeProps) {
  const cfg = LEGACY_NODE_CFG[data.nodeType as string] || {
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
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    hasWorkspace,
    refreshWorkspaces,
    loading: wsLoading,
  } = useWorkspace();
  const { toast } = useToast();
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
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGen, setAiGen] = useState(false);
  const [apiKeyVal, setApiKeyVal] = useState("");
  const [webhookUrlVal, setWebhookUrlVal] = useState("");
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [componentMap, setComponentMap] = useState<
    Record<string, ComponentDefinition>
  >({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string[]>
  >({});
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false);

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

  useEffect(() => {
    const k = localStorage.getItem("agentflow-api-key");
    if (k) setApiKeyVal(k);
    const w = localStorage.getItem("agentflow-webhook-url");
    if (w) setWebhookUrlVal(w);
  }, []);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const list = await fetchComponentCatalog({}, token() || undefined);
        setComponents(list);
        setComponentMap(
          list.reduce<Record<string, ComponentDefinition>>((acc, c) => {
            acc[c.id] = c;
            return acc;
          }, {}),
        );
      } catch (e: any) {
        toast({
          title: "Failed to load components",
          description: e.message,
          variant: "destructive",
        });
      }
    };
    loadCatalog();
  }, []);

  // Show workspace prompt when no workspace exists
  useEffect(() => {
    if (!wsLoading && !hasWorkspace) {
      toast({
        title: "No Workspace Found",
        description:
          "You need to create a workspace to start building workflows.",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [wsLoading, hasWorkspace]);

  useEffect(() => {
    if (activeRun?.id) {
      const cleanup = streamRunEvents(activeRun.id);
      return cleanup;
    }
  }, [activeRun?.id]);

  useEffect(() => {
    if (!isNew) {
      const loadWorkflow = async () => {
        try {
          const r = await api.get(`/api/v1/workflows/${wfId}`);
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
                componentId:
                  n.metadata?.componentId ||
                  n.componentId ||
                  n.nodeType?.toLowerCase?.().replace(/_/g, "-"),
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
        } catch (e: any) {
          toast({
            title: "Failed to load workflow",
            description: e.message,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };
      loadWorkflow();
    }
  }, [wfId, isNew]);

  const save = async () => {
    if (!hasWorkspace) {
      toast({
        title: "Workspace required",
        description: "Create a workspace before saving workflows.",
        variant: "destructive",
      });
      setShowWorkspaceModal(true);
      return;
    }

    setSaving(true);
    try {
      const nodeValidation: Record<string, string[]> = {};
      const normalizedByNode: Record<string, Record<string, unknown>> = {};

      for (const n of nodes) {
        const componentId =
          (n.data.componentId as string) ||
          (n.data.nodeType as string)?.toLowerCase().replace(/_/g, "-");
        if (!componentId) continue;
        const result = await validateNodeConfig(
          componentId,
          (n.data.config || {}) as Record<string, unknown>,
          token() || undefined,
        );
        if (!result.ok) {
          nodeValidation[n.id] = result.errors.map(
            (er) => `${er.path}: ${er.message}`,
          );
        } else {
          normalizedByNode[n.id] = result.normalizedConfig;
        }
      }

      setValidationErrors(nodeValidation);
      if (Object.keys(nodeValidation).length > 0) {
        toast({
          title: "Validation errors",
          description: `${Object.keys(nodeValidation).length} node(s) have configuration issues. Check the properties panel.`,
          variant: "destructive",
        });
        return;
      }

      const p = {
        name: wfName,
        description: wfDesc,
        nodes: nodes.map((n) => {
          const componentId =
            (n.data.componentId as string) ||
            (n.data.nodeType as string)?.toLowerCase().replace(/_/g, "-");
          const fallback = LEGACY_NODE_CFG[n.data.nodeType as string];
          return {
            id: n.id,
            nodeType: n.data.nodeType,
            category:
              (n.data.category as string) ||
              componentMap[componentId]?.category ||
              fallback?.cat ||
              "core",
            label:
              (n.data.label as string) ||
              componentMap[componentId]?.name ||
              fallback?.label ||
              "Node",
            config: normalizedByNode[n.id] || n.data.config || {},
            position: n.position,
            metadata: { componentId },
          };
        }),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
      };

      if (isNew) {
        const r = await api.post("/api/v1/workflows", p);
        toast({
          title: "Workflow created",
          description: `"${wfName}" has been saved.`,
          variant: "success",
        });
        router.push(`/workflow/${r.data.id}`);
      } else {
        await api.put(`/api/v1/workflows/${wfId}`, p);
        toast({
          title: "Workflow saved",
          description: "Changes have been saved.",
          variant: "success",
        });
      }
    } catch (e: any) {
      if (
        e.message?.includes("No workspace") ||
        e.message?.includes("workspace")
      ) {
        setShowWorkspaceModal(true);
      }
      toast({
        title: "Save failed",
        description: e.message || "Failed to save workflow",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exec = async () => {
    if (isNew) return;
    if (!hasWorkspace) {
      toast({
        title: "Workspace required",
        description: "Create a workspace to run workflows.",
        variant: "destructive",
      });
      return;
    }
    setExecuting(true);
    try {
      const r = await api.post(`/api/v1/execution/run/${wfId}`, {});
      toast({
        title: "Run started",
        description: "Workflow execution has been initiated.",
        variant: "success",
      });
      setActiveMode("runs");
      streamRunEvents(r.data.id);
    } catch (e: any) {
      toast({
        title: "Execution failed",
        description: e.message || "Failed to start workflow run",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const streamRunEvents = (runId: string) => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(
        `${BACKEND_URL}/api/v1/execution/events/${runId}?token=${encodeURIComponent(token()!.replace("Bearer ", ""))}`,
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status || data.id) {
            setActiveRun((prev: any) => ({ ...prev, ...data }));
          }
          if (data.nodeId) {
            setRunSteps((prev) => {
              const existingIndex = prev.findIndex(
                (s) => s.stepId === data.stepId || s.id === data.stepId,
              );
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = { ...prev[existingIndex], ...data };
                return updated;
              }
              return [...prev, { ...data, id: data.stepId }];
            });
            setNodes((n) =>
              n.map((nd) => ({
                ...nd,
                data: {
                  ...nd.data,
                  runStatus:
                    nd.id === data.nodeId ? data.status : nd.data.runStatus,
                },
              })),
            );
          }
        } catch {}
      };

      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
      };
    } catch {
      pollFallback(runId);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  };

  const pollFallback = async (id: string) => {
    const go = async () => {
      try {
        const r = await api.get(`/api/v1/execution/run/${id}`);
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
      const r = await api.post("/api/v1/generate/workflow", { prompt });
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
      toast({
        title: "Workflow generated",
        description: `"${g.name}" with ${g.nodes.length} nodes.`,
        variant: "success",
      });
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e.message || "Failed to generate workflow",
        variant: "destructive",
      });
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
      const componentId =
        e.dataTransfer.getData("componentId") ||
        e.dataTransfer.getData("nodeType");
      if (!componentId) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const component = componentMap[componentId];
      const fallback =
        LEGACY_NODE_CFG[componentId] ||
        LEGACY_NODE_CFG[
          componentId
            .toUpperCase()
            .replace(/-/g, "_") as keyof typeof LEGACY_NODE_CFG
        ];

      setNodes((n) => [
        ...n,
        {
          id: `${componentId}-${Date.now()}`,
          type: "workflowNode",
          position: pos,
          data: {
            nodeType:
              componentId.toUpperCase().replace(/-/g, "_") || "CUSTOM_NODE",
            componentId,
            category: component?.category || fallback?.cat || "core",
            label: component?.name || fallback?.label || componentId,
            config: component ? getConfigDefaults(component.configFields) : {},
          },
        },
      ]);
    },
    [screenToFlowPosition, componentMap],
  );

  const featureDisabled = !hasWorkspace;

  if (loading || wsLoading)
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

          {/* Workspace mini-switcher */}
          <div className="relative">
            <button
              onClick={() => setWsSwitcherOpen(!wsSwitcherOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-white/5"
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                style={{ background: "rgba(99,102,241,0.15)" }}
              >
                {activeWorkspace ? (
                  <span className="text-[9px] font-bold text-indigo-400">
                    {activeWorkspace.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Building2 className="w-3 h-3 text-indigo-400" />
                )}
              </div>
              <span
                className="text-xs truncate max-w-[100px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {activeWorkspace?.name || "No Workspace"}
              </span>
              <ChevronsUpDown
                className="w-3 h-3"
                style={{ color: "var(--text-muted)" }}
              />
            </button>

            <AnimatePresence>
              {wsSwitcherOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 w-56 rounded-lg border shadow-xl z-50 overflow-hidden"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="p-1 max-h-48 overflow-y-auto">
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspace(ws);
                          setWsSwitcherOpen(false);
                          toast({
                            title: "Workspace switched",
                            description: `Now using "${ws.name}"`,
                            variant: "success",
                          });
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-white/5"
                      >
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                          style={{ background: "rgba(99,102,241,0.1)" }}
                        >
                          <span className="text-[9px] font-bold text-indigo-500">
                            {ws.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span
                          className="text-xs truncate flex-1"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {ws.name}
                        </span>
                        {activeWorkspace?.id === ws.id && (
                          <Check className="w-3 h-3 text-indigo-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div
                    className="border-t p-1"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <button
                      onClick={() => {
                        setWsSwitcherOpen(false);
                        setShowWorkspaceModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-white/5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span className="text-xs">New Workspace</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className="w-px h-5"
            style={{ background: "var(--border-subtle)" }}
          />
          <input
            value={wfName}
            onChange={(e) => setWfName(e.target.value)}
            className="text-sm font-medium bg-transparent border-none outline-none w-48"
            style={{ color: "var(--text-primary)" }}
            disabled={featureDisabled}
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
            disabled={saving || featureDisabled}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-50"
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
            disabled={executing || isNew || featureDisabled}
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

      {/* No workspace overlay */}
      {featureDisabled && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Building2
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: "var(--text-muted)" }}
            />
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Create a Workspace to Get Started
            </h2>
            <p
              className="text-sm mb-5"
              style={{ color: "var(--text-muted)" }}
            >
              Workspaces organize your workflows, secrets, and team members. You
              need one to build and run workflows.
            </p>
            <button
              onClick={() => setShowWorkspaceModal(true)}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Main editor area (only when workspace exists) */}
      {!featureDisabled && (
        <div className="flex-1 flex overflow-hidden">
          {/* ─── Left Panel ──── */}
          {activeMode === "design" && leftOpen && (
            <div
              className="flex border-r"
              style={{ borderColor: "var(--border-subtle)" }}
            >
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
                        leftTab === t.id
                          ? "rgba(99,102,241,0.1)"
                          : "transparent",
                      color:
                        leftTab === t.id ? "#6366f1" : "var(--text-muted)",
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
                    {Object.entries(groupComponentsByCategory(components)).map(
                      ([cat, items]) => (
                        <div key={cat} className="mb-3">
                          <p
                            className="text-[10px] font-medium uppercase tracking-wider mb-1 px-1"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {categoryLabel(cat as ComponentCategory)}
                          </p>
                          {items.map((it) => (
                            <div
                              key={it.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("componentId", it.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              className="flex items-center space-x-2 p-1.5 mb-0.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors group"
                            >
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: "#6366f115",
                                  color: "#6366f1",
                                }}
                              >
                                <Workflow className="w-3 h-3" />
                              </div>
                              <span
                                className="text-[11px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {it.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ),
                    )}
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
                        value={apiKeyVal}
                        onChange={(e) => setApiKeyVal(e.target.value)}
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
                        value={webhookUrlVal}
                        onChange={(e) => setWebhookUrlVal(e.target.value)}
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
                        localStorage.setItem(
                          "agentflow-api-key",
                          apiKeyVal,
                        );
                        localStorage.setItem(
                          "agentflow-webhook-url",
                          webhookUrlVal,
                        );
                        toast({
                          title: "Settings saved",
                          variant: "success",
                        });
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
                  streamRunEvents(run.id);
                }}
                onRefresh={async () => {
                  if (!isNew) {
                    setAllRunsLoading(true);
                    try {
                      const r = await api.get(`/api/v1/workflows/${wfId}`);
                      setRuns(r.data.runs || []);
                    } catch (e: any) {
                      toast({
                        title: "Failed to refresh runs",
                        description: e.message,
                        variant: "destructive",
                      });
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
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
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
                                    data: {
                                      ...nd.data,
                                      label: e.target.value,
                                    },
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
                        {(selNode.data.componentId as string) ||
                          (selNode.data.nodeType as string)}
                      </p>
                    </div>
                    {validationErrors[selNode.id]?.length ? (
                      <div
                        className="p-2 rounded-lg border text-[10px]"
                        style={{
                          borderColor: "rgba(239,68,68,0.35)",
                          background: "rgba(239,68,68,0.08)",
                          color: "#ef4444",
                        }}
                      >
                        {validationErrors[selNode.id].map((err, idx) => (
                          <p key={idx}>{err}</p>
                        ))}
                      </div>
                    ) : null}
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
                          fields={
                            componentMap[selNode.data.componentId as string]
                              ?.configFields || []
                          }
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
                        setNodes((n) =>
                          n.filter((nd) => nd.id !== selNode.id),
                        );
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
      )}

      {/* Create Workspace Modal */}
      {showWorkspaceModal && (
        <CreateWorkspaceModal
          open={showWorkspaceModal}
          onOpenChange={setShowWorkspaceModal}
          onSuccess={() => refreshWorkspaces()}
        />
      )}
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
