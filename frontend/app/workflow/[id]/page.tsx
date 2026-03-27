"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import { resolveIcon, categoryColor } from "@/components/workflow/config/iconMap";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { BACKEND_URL } from "@/app/config";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { RunsPanel } from "@/components/workflow/runs/RunsPanel";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth-token";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { useToast } from "@/components/hooks/use-toast";
import { useWorkflowStore } from "@/store/workflowStore";
// autosave removed — workflow must be saved manually before running
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
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
  Pause,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Building2,
  ChevronsUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Tag,
  Trash2,
  Square,
  AlertTriangle,
  Users,
  Search,
  FileOutput,
  ClipboardList,
} from "lucide-react";
import type {
  Node,
  Edge,
  NodeProps,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from "@xyflow/react";

/** Plain text for Run button: read from Entry Point node config (`testRunPlainText`). */
function getEntryPointTestRunPlainText(nodes: Node[]): string {
  const entry = nodes.find((n) => {
    const d = n.data as Record<string, unknown>;
    const comp = String(d?.componentId || "").toLowerCase();
    const nt = String(d?.nodeType || "")
      .toLowerCase()
      .replace(/_/g, "-");
    return comp === "entry-point" || nt === "entry-point";
  });
  if (!entry) return "";
  const cfg = (entry.data as { config?: Record<string, unknown> })?.config;
  const v = cfg?.testRunPlainText;
  return typeof v === "string" ? v : "";
}

// ─── Node type registry ──────────────────────────────────────────
const LEGACY_NODE_CFG: Record<
  string,
  { icon: any; color: string; label: string; cat: string }
> = {
  WEBHOOK_TRIGGER: { icon: Globe, color: "#f59e0b", label: "Webhook", cat: "TRIGGER" },
  SCHEDULE_TRIGGER: { icon: Clock, color: "#f59e0b", label: "Schedule", cat: "TRIGGER" },
  FILE_UPLOAD_TRIGGER: { icon: FileText, color: "#f59e0b", label: "File Upload", cat: "TRIGGER" },
  API_TRIGGER: { icon: Globe, color: "#f59e0b", label: "API Trigger", cat: "TRIGGER" },
  EXTRACTION_AGENT: { icon: Brain, color: "#6366f1", label: "Extraction", cat: "AI_AGENT" },
  SUMMARIZATION_AGENT: { icon: FileText, color: "#6366f1", label: "Summarizer", cat: "AI_AGENT" },
  CLASSIFICATION_AGENT: { icon: GitBranch, color: "#8b5cf6", label: "Classifier", cat: "AI_AGENT" },
  REASONING_AGENT: { icon: Brain, color: "#7c3aed", label: "Reasoning", cat: "AI_AGENT" },
  DECISION_AGENT: { icon: GitBranch, color: "#6366f1", label: "Decision", cat: "AI_AGENT" },
  VERIFICATION_AGENT: { icon: Shield, color: "#10b981", label: "Verify", cat: "AI_AGENT" },
  COMPLIANCE_AGENT: { icon: Shield, color: "#3b82f6", label: "Compliance", cat: "AI_AGENT" },
  IF_CONDITION: { icon: GitBranch, color: "#06b6d4", label: "If / Else", cat: "LOGIC" },
  LOOP: { icon: RotateCcw, color: "#06b6d4", label: "Loop", cat: "LOGIC" },
  PARALLEL: { icon: Activity, color: "#06b6d4", label: "Parallel", cat: "LOGIC" },
  SLACK_SEND: { icon: MessageSquare, color: "#10b981", label: "Slack", cat: "ACTION" },
  EMAIL_SEND: { icon: Mail, color: "#3b82f6", label: "Email", cat: "ACTION" },
  HTTP_REQUEST: { icon: Globe, color: "#10b981", label: "HTTP", cat: "ACTION" },
  API_CALL: { icon: Globe, color: "#14b8a6", label: "API Call", cat: "ACTION" },
  DB_WRITE: { icon: Database, color: "#f97316", label: "Database", cat: "ACTION" },
  DELAY: { icon: Timer, color: "#6b7280", label: "Delay", cat: "CONTROL" },
  APPROVAL: { icon: Pause, color: "#eab308", label: "Approval", cat: "CONTROL" },
  RETRY: { icon: RotateCcw, color: "#6b7280", label: "Retry", cat: "CONTROL" },
  ERROR_HANDLER: { icon: AlertCircle, color: "#ef4444", label: "Error Handler", cat: "CONTROL" },
  // Enterprise nodes (kebab-case IDs from catalog)
  "entry-point": { icon: Zap, color: "#f59e0b", label: "Start Trigger", cat: "INPUT" },
  "http-request": { icon: Globe, color: "#3b82f6", label: "API Call", cat: "INTEGRATION" },
  "slack-send": { icon: MessageSquare, color: "#3b82f6", label: "Slack Message", cat: "INTEGRATION" },
  "email-send": { icon: Mail, color: "#3b82f6", label: "Send Email", cat: "INTEGRATION" },
  "db-query": { icon: Database, color: "#3b82f6", label: "Database Query", cat: "INTEGRATION" },
  "if-condition": { icon: GitBranch, color: "#10b981", label: "If / Else", cat: "LOGIC" },
  "switch-case": { icon: GitBranch, color: "#10b981", label: "Switch / Router", cat: "LOGIC" },
  "loop": { icon: RotateCcw, color: "#10b981", label: "Loop", cat: "LOGIC" },
  "ai-agent": { icon: Brain, color: "#8b5cf6", label: "AI Agent", cat: "AI" },
  "text-transform": { icon: FileText, color: "#8b5cf6", label: "Text Transform", cat: "AI" },
  "delay": { icon: Timer, color: "#6b7280", label: "Delay / Wait", cat: "CONTROL" },
  "error-handler": { icon: AlertCircle, color: "#6b7280", label: "Error Handler", cat: "CONTROL" },
  "approval": { icon: Pause, color: "#6b7280", label: "Manual Approval", cat: "CONTROL" },
  "artifact-writer": { icon: FileText, color: "#6366f1", label: "Artifact Writer", cat: "OUTPUT" },
  "webhook-response": { icon: Globe, color: "#6366f1", label: "Webhook Response", cat: "OUTPUT" },
  "sla-monitor": { icon: Timer, color: "#ef4444", label: "SLA Monitor", cat: "CONTROL" },
  "audit-log": { icon: ClipboardList, color: "#6366f1", label: "Audit Log", cat: "OUTPUT" },
  "task-assigner": { icon: Users, color: "#6b7280", label: "Task Assigner", cat: "CONTROL" },
  "escalation": { icon: AlertTriangle, color: "#f59e0b", label: "Escalation", cat: "CONTROL" },
  "data-enrichment": { icon: Search, color: "#8b5cf6", label: "Data Enrichment", cat: "AI" },
  "document-generator": { icon: FileOutput, color: "#6366f1", label: "Document Generator", cat: "OUTPUT" },
  "form-input": { icon: ClipboardList, color: "#f59e0b", label: "Form Input", cat: "INPUT" },
  "chat-model": { icon: MessageSquare, color: "#8b5cf6", label: "Chat Model", cat: "AI" },
  "agent-memory": { icon: Database, color: "#3b82f6", label: "Memory", cat: "AI" },
  "agent-tool": { icon: Settings, color: "#f59e0b", label: "Tool", cat: "AI" },
};

function buildNodeCfg(
  catalog: ComponentDefinition[],
): Record<string, { icon: any; color: string; label: string; cat: string }> {
  const cfg: Record<string, { icon: any; color: string; label: string; cat: string }> = {
    ...LEGACY_NODE_CFG,
  };
  for (const c of catalog) {
    const entry = {
      icon: resolveIcon(c.icon),
      color: categoryColor(c.category),
      label: c.name,
      cat: c.category.toUpperCase(),
    };
    cfg[c.id] = entry;
    cfg[c.id.toUpperCase().replace(/-/g, "_")] = entry;
  }
  return cfg;
}

const CAT_LABELS: Record<string, string> = {
  TRIGGER: "Trigger", INPUT: "Input", AI_AGENT: "AI Agent", AI: "AI",
  LOGIC: "Logic", ACTION: "Action", INTEGRATION: "Integration",
  CONTROL: "Control", OUTPUT: "Output",
};

// ─── Canvas Node component ─────────────────────────────────────
function FlowNode({ data, isConnectable }: NodeProps) {
  const legacyCfg = LEGACY_NODE_CFG[data.nodeType as string];
  const cfg = legacyCfg ?? {
    icon: data.iconName ? resolveIcon(data.iconName as string) : Zap,
    color: data.componentId
      ? categoryColor((data.category as string) || "core")
      : "#6b7280",
    label: "Node",
    cat: ((data.category as string) || "ACTION").toUpperCase(),
  };
  const Icon = cfg.icon;
  const isRunning = data.runStatus === "RUNNING";
  const isCompleted = data.runStatus === "COMPLETED";
  const isFailed = data.runStatus === "FAILED";
  const hasIssue = data.hasValidationError === true;
  const isStartNode = ["TRIGGER", "INPUT"].includes(cfg.cat);

  return (
    <div
      className="rounded-xl border transition-all w-[200px]"
      style={{
        background: "var(--bg-card)",
        borderColor: data.selected
          ? "#6366f1"
          : hasIssue
            ? "#f59e0b"
            : isRunning
              ? "#3b82f6"
              : isCompleted
                ? "#10b981"
                : isFailed
                  ? "#ef4444"
                  : "var(--border-medium)",
        boxShadow: data.selected
          ? "0 0 0 2px rgba(99,102,241,0.2)"
          : hasIssue
            ? "0 0 0 2px rgba(245,158,11,0.25)"
            : isRunning
              ? "0 0 12px rgba(59,130,246,0.3)"
              : "var(--shadow-card)",
      }}
    >
      {!isStartNode && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !border-2 !rounded-full !opacity-0 hover:!opacity-100 transition-opacity"
          style={{ background: cfg.color, borderColor: "var(--bg-card)" }}
          isConnectable={isConnectable}
        />
      )}
      <div className="p-3 flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
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
            {CAT_LABELS[cfg.cat] || cfg.cat.replace(/_/g, " ")}
          </p>
        </div>
        {isCompleted && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        )}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
        {isRunning && (
          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
        )}
        {hasIssue && !isRunning && !isCompleted && !isFailed && (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
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

// ─── Custom node type imports ─────────────────────────────────
import AIAgentNode from "@/components/workflow/nodes/AIAgentNode";
import ChatModelNode from "@/components/workflow/nodes/ChatModelNode";
import MemoryNode from "@/components/workflow/nodes/MemoryNode";
import ToolNode from "@/components/workflow/nodes/ToolNode";
import { migrateWorkflow } from "@/components/workflow/utils/componentMigration";
import {
  validateWorkflowNodes,
  type NodeIssue,
} from "@/components/workflow/utils/nodeValidation";

const nodeTypes = {
  workflowNode: FlowNode,
  aiAgentNode: AIAgentNode,
  chatModelNode: ChatModelNode,
  memoryNode: MemoryNode,
  toolNode: ToolNode,
};

// ─── Main Workflow Component ────────────────────────────────────
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

  // ── Zustand store selectors ──
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const wfName = useWorkflowStore((s) => s.wfName);
  const wfDesc = useWorkflowStore((s) => s.wfDesc);
  const wfStatus = useWorkflowStore((s) => s.wfStatus);
  const selNodeId = useWorkflowStore((s) => s.selNodeId);
  const runs = useWorkflowStore((s) => s.runs);
  const activeRun = useWorkflowStore((s) => s.activeRun);
  const runSteps = useWorkflowStore((s) => s.runSteps);
  const components = useWorkflowStore((s) => s.components);
  const componentMap = useWorkflowStore((s) => s.componentMap);
  const validationErrors = useWorkflowStore((s) => s.validationErrors);

  // Store actions (stable references via getState)
  const storeActions = useRef(useWorkflowStore.getState()).current;
  const {
    setNodes,
    setEdges,
    onNodesChange: storeOnNodesChange,
    onEdgesChange: storeOnEdgesChange,
    onConnect: storeOnConnect,
    selectNode,
    clearSelection,
    setWfName,
    setWfDesc,
    setWfStatus,
    addNode,
    deleteNode,
    updateNodeData,
    markSaved,
    setCatalog,
    setValidationErrors,
    setRuns,
    setActiveRun,
    setRunSteps,
    loadWorkflow,
    reset,
  } = storeActions;

  // Derived: selected node object
  const selNode = useMemo(
    () => nodes.find((n) => n.id === selNodeId) ?? null,
    [nodes, selNodeId],
  );

  // UI-only local state
  const [activeMode, setActiveMode] = useState<"design" | "runs" | "logs">(
    (searchParams?.get("tab") as any) || "design",
  );
  const [leftTab, setLeftTab] = useState<"ai" | "nodes">(
    isNew ? "ai" : "nodes",
  );
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightWidth, setRightWidth] = useState(360);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [descExpanded, setDescExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGen, setAiGen] = useState(false);
  const [allRunsLoading, setAllRunsLoading] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false);

  const viewingRunIdRef = useRef<string | null>(null);
  const savedSnapshotRef = useRef<string>("");

  const { screenToFlowPosition } = useReactFlow();

  const NODE_CFG = useMemo(() => buildNodeCfg(components), [components]);

  const stoppableRunId = useMemo(() => {
    const fromList = runs.find((r: any) =>
      ["RUNNING", "PENDING", "WAITING_APPROVAL"].includes(r.status),
    );
    if (fromList) return fromList.id as string;
    if (
      activeRun &&
      ["RUNNING", "PENDING", "WAITING_APPROVAL"].includes(activeRun.status)
    )
      return activeRun.id as string;
    return null;
  }, [runs, activeRun]);

  // ── ReactFlow handlers ──
  const onNC: OnNodesChange = useCallback(
    (c) => storeOnNodesChange(c),
    [],
  );
  const onEC: OnEdgesChange = useCallback(
    (c) => storeOnEdgesChange(c),
    [],
  );
  const onCon: OnConnect = useCallback(
    (p) => storeOnConnect(p),
    [],
  );

  // Load component catalog
  useEffect(() => {
    fetchComponentCatalog({}, getToken() || undefined)
      .then((list) => {
        const map = list.reduce<Record<string, ComponentDefinition>>((acc, c) => {
          acc[c.id] = c;
          return acc;
        }, {});
        setCatalog(list, map);
      })
      .catch((err: unknown) => {
        console.error("Failed to load component catalog", err);
        toast({
          title: "Failed to load components",
          description: "The node catalog could not be fetched.",
          variant: "destructive",
        });
      });
  }, []);

  // Warn on unsaved changes before navigating away
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!savedSnapshotRef.current) return;
      const current = JSON.stringify({ nodes, edges });
      if (current !== savedSnapshotRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [nodes, edges]);

  // Prompt if no workspace
  useEffect(() => {
    if (!wsLoading && !hasWorkspace) {
      toast({
        title: "No workspace found",
        description: "Create a workspace to start building workflows.",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [wsLoading, hasWorkspace]);

  // Auto-fetch details for running runs (SSE/polling)
  useEffect(() => {
    if (
      activeRun?.id &&
      ["RUNNING", "PENDING", "WAITING_APPROVAL"].includes(activeRun.status)
    ) {
      const cleanup = streamRunEvents(activeRun.id);
      return cleanup;
    }
  }, [activeRun?.id, activeRun?.status]);

  // Reset store on unmount
  useEffect(() => {
    return () => { reset(); };
  }, []);

  // Load existing workflow
  useEffect(() => {
    if (isNew) {
      const tpl = sessionStorage.getItem("template-import");
      if (tpl) {
        try {
          const t = JSON.parse(tpl);
          // Run migration on template nodes
          const migrated = migrateWorkflow(t.nodes || [], t.edges || []);
          loadWorkflow({
            name: t.name,
            description: t.description || "",
            status: "DRAFT",
            nodes: migrated.nodes,
            edges: migrated.edges,
            runs: [],
          });
          if (migrated.migrations.length > 0) {
            toast({
              title: "Template components migrated",
              description: migrated.migrations.join("; "),
              variant: "default",
              duration: 8000,
            });
          }
          // Defer removal so React Strict Mode re-mount can still read it
          setTimeout(() => sessionStorage.removeItem("template-import"), 500);
        } catch (err: unknown) {
          console.error("Failed to import workflow template", err);
        }
      }
      return;
    }
    const load = async () => {
      try {
        const r = await api.get(`/api/v1/workflows/${wfId}`);
        const d = r.data;
        const LOAD_NODE_MAP: Record<string, string> = {
          "ai-agent": "aiAgentNode",
          "chat-model": "chatModelNode",
          "agent-memory": "memoryNode",
          "agent-tool": "toolNode",
        };
        const mappedNodes = (d.nodes || []).map((n: any) => {
          const cid =
            n.metadata?.componentId ||
            n.componentId ||
            n.nodeType?.toLowerCase?.().replace(/_/g, "-");
          return {
            id: n.id,
            type: LOAD_NODE_MAP[cid] || "workflowNode",
            position: n.position || { x: 300, y: 0 },
            data: {
              nodeType: n.nodeType,
              componentId: cid,
              category: n.category,
              label: n.label,
              config: n.config,
            },
          };
        });
        const mappedEdges = (d.edges || []).map((e: any) => ({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
        }));
        // Run component migration on loaded workflow
        const migrated = migrateWorkflow(mappedNodes, mappedEdges);
        loadWorkflow({
          name: d.name,
          description: d.description || "",
          status: d.status || "DRAFT",
          nodes: migrated.nodes,
          edges: migrated.edges,
          runs: d.runs || [],
        });
        if (migrated.migrations.length > 0) {
          toast({
            title: "Components migrated",
            description: migrated.migrations.join("; "),
            variant: "default",
            duration: 8000,
          });
        }
        savedSnapshotRef.current = JSON.stringify({
          nodes: d.nodes || [],
          edges: d.edges || [],
        });
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
    load();
  }, [wfId, isNew]);

  // ── Undo / Redo keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      const temporal = useWorkflowStore.temporal.getState();
      if (e.shiftKey) {
        temporal.redo();
      } else {
        temporal.undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const save = async () => {
    if (!hasWorkspace) {
      toast({
        title: "Workspace required",
        description: "Create a workspace before saving.",
        variant: "destructive",
      });
      setShowWorkspaceModal(true);
      return;
    }
    setSaving(true);
    try {
      const { nodes: curNodes, edges: curEdges, wfName: curName, wfDesc: curDesc } =
        useWorkflowStore.getState();

      const nodeValidation: Record<string, string[]> = {};
      const normalizedByNode: Record<string, Record<string, unknown>> = {};
      for (const n of curNodes) {
        const componentId =
          (n.data.componentId as string) ||
          (n.data.nodeType as string)?.toLowerCase().replace(/_/g, "-");
        if (!componentId) continue;
        const result = await validateNodeConfig(
          componentId,
          (n.data.config || {}) as Record<string, unknown>,
          getToken() || undefined,
        );
        if (!result.ok) {
          nodeValidation[n.id] = result.errors.map(
            (er) => `${er.path}: ${er.message}`,
          );
        } else {
          normalizedByNode[n.id] = result.normalizedConfig;
        }
      }
      // Also run structural validation (connections, required fields)
      const structuralIssues = validateWorkflowNodes(curNodes, curEdges);
      for (const issue of structuralIssues) {
        if (issue.severity === "error") {
          nodeValidation[issue.nodeId] = [
            ...(nodeValidation[issue.nodeId] || []),
            issue.message,
          ];
        }
      }

      setValidationErrors(nodeValidation);

      // Mark nodes with validation issues visually
      const updatedNodes = curNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          hasValidationError: !!nodeValidation[n.id] || structuralIssues.some(
            (i) => i.nodeId === n.id,
          ),
        },
      }));
      setNodes(updatedNodes);

      if (Object.keys(nodeValidation).length > 0 || structuralIssues.length > 0) {
        // Show stacked toasts for each issue (limit to 5)
        const allIssues = [
          ...Object.entries(nodeValidation).flatMap(([id, errs]) => {
            const node = curNodes.find((n) => n.id === id);
            const label = (node?.data.label as string) || id;
            return errs.map((msg) => ({ label, msg, severity: "error" as const }));
          }),
          ...structuralIssues
            .filter((i) => i.severity === "warning")
            .map((i) => ({ label: i.nodeLabel, msg: i.message, severity: "warning" as const })),
        ];

        const shown = allIssues.slice(0, 5);
        const remaining = allIssues.length - shown.length;

        for (const issue of shown) {
          toast({
            title: `${issue.severity === "error" ? "Error" : "Warning"}: ${issue.label}`,
            description: issue.msg,
            variant: issue.severity === "error" ? "destructive" : "default",
            duration: 8000,
          });
        }

        if (remaining > 0) {
          toast({
            title: "More issues found",
            description: `${remaining} additional issue(s). Check node configurations.`,
            variant: "destructive",
            duration: 8000,
          });
        }

        if (Object.keys(nodeValidation).length > 0) return;
      }

      const curComponentMap = useWorkflowStore.getState().componentMap;
      const payload = {
        name: curName,
        description: curDesc,
        workspaceId: activeWorkspace?.id,
        nodes: curNodes.map((n) => {
          const componentId =
            (n.data.componentId as string) ||
            (n.data.nodeType as string)?.toLowerCase().replace(/_/g, "-");
          const fallback = NODE_CFG[n.data.nodeType as string];
          return {
            id: n.id,
            nodeType: n.data.nodeType,
            category:
              (n.data.category as string) ||
              curComponentMap[componentId]?.category ||
              fallback?.cat ||
              "core",
            label:
              (n.data.label as string) ||
              curComponentMap[componentId]?.name ||
              fallback?.label ||
              "Node",
            config: normalizedByNode[n.id] || n.data.config || {},
            position: n.position,
            metadata: { componentId },
          };
        }),
        edges: curEdges.map((e) => ({ source: e.source, target: e.target })),
      };

      if (isNew) {
        const r = await api.post("/api/v1/workflows", payload);
        savedSnapshotRef.current = JSON.stringify({ nodes: curNodes, edges: curEdges });
        markSaved();
        toast({ title: "Workflow saved", variant: "success" });
        router.push(`/workflow/${r.data.id}`);
      } else {
        await api.put(`/api/v1/workflows/${wfId}`, payload);
        savedSnapshotRef.current = JSON.stringify({ nodes: curNodes, edges: curEdges });
        markSaved();
        toast({ title: "Workflow saved", variant: "success" });
      }
    } catch (e: any) {
      if (e.message?.toLowerCase().includes("workspace")) {
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

  // Autosave removed — user must save manually before running

  const fetchRunDetails = async (
    runId: string,
    opts?: { background?: boolean },
  ) => {
    if (!opts?.background) {
      viewingRunIdRef.current = runId;
    }
    try {
      const r = await api.get(`/api/v1/execution/run/${runId}`);
      const data = r.data;

      if (opts?.background && viewingRunIdRef.current !== runId) {
        setRuns((prev: any[]) => {
          const exists = prev.some((x: any) => x.id === runId);
          if (!exists) return [...prev, data];
          return prev.map((x: any) => (x.id === runId ? { ...x, ...data } : x));
        });
        return data;
      }

      setActiveRun(data);
      setRunSteps(data.steps || []);
      const m = new Map(
        (data.steps || []).map((s: any) => [s.nodeId, s.status]),
      );
      setNodes((n: Node[]) =>
        n.map((nd) => ({
          ...nd,
          data: { ...nd.data, runStatus: m.get(nd.id) || null },
        })),
      );
      return data;
    } catch {
      return null;
    }
  };

  const cancelStoppableRun = async () => {
    const id = stoppableRunId;
    if (!id) return;
    setCancelling(true);
    try {
      await api.post(`/api/v1/execution/run/${id}/cancel`, {});
      toast({ title: "Run stopped", variant: "success" });
      try {
        const r = await api.get(`/api/v1/workflows/${wfId}`);
        setRuns(r.data.runs || []);
      } catch (err: unknown) {
        console.error("Failed to refresh runs after cancel", err);
      }
      if (viewingRunIdRef.current) {
        await fetchRunDetails(viewingRunIdRef.current);
      }
    } catch (e: any) {
      toast({
        title: "Stop failed",
        description: e.message || "Could not cancel run",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const exec = async () => {
    if (isNew || !hasWorkspace) {
      toast({
        title: "Save required",
        description: "Please save the workflow before running it.",
        variant: "destructive",
      });
      return;
    }
    const { isDirty } = useWorkflowStore.getState();
    if (isDirty) {
      toast({
        title: "Unsaved changes",
        description: "Save your workflow before running. Unsaved changes will not be executed.",
        variant: "destructive",
      });
      return;
    }
    const curNodes = useWorkflowStore.getState().nodes;
    const triggerData: Record<string, unknown> = {
      text: getEntryPointTestRunPlainText(curNodes),
    };
    setExecuting(true);
    try {
      const r = await api.post(`/api/v1/execution/run/${wfId}`, {
        triggerData,
      });
      toast({ title: "Run started", variant: "success" });
      viewingRunIdRef.current = r.data.id;
      setActiveMode("runs");
      setActiveRun(r.data);
      setRunSteps([]);
      pollRunUntilDone(r.data.id);
    } catch (e: any) {
      toast({
        title: "Run failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const pollRunUntilDone = async (runId: string) => {
    const poll = async () => {
      const data = await fetchRunDetails(runId, { background: true });
      if (
        data &&
        ["RUNNING", "PENDING", "WAITING_APPROVAL"].includes(data.status)
      ) {
        setTimeout(poll, 1500);
      } else if (data) {
        try {
          const r = await api.get(`/api/v1/workflows/${wfId}`);
          setRuns(r.data.runs || []);
        } catch (err: unknown) {
          console.error("Failed to refresh runs after poll", err);
        }
      }
    };
    poll();
  };

  const streamRunEvents = (runId: string) => {
    fetchRunDetails(runId);

    let es: EventSource | null = null;
    try {
      es = new EventSource(
        `${BACKEND_URL}/api/v1/execution/events/${runId}?token=${encodeURIComponent(
          (getToken() || "").replace("Bearer ", ""),
        )}`,
      );
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (viewingRunIdRef.current !== runId) return;
          if (data.status || data.id)
            setActiveRun((p: any) => ({ ...p, ...data }));
          if (data.nodeId) {
            setRunSteps((prev: any[]) => {
              const idx = prev.findIndex(
                (s) => s.stepId === data.stepId || s.id === data.stepId,
              );
              if (idx >= 0) {
                const u = [...prev];
                u[idx] = { ...prev[idx], ...data };
                return u;
              }
              return [...prev, { ...data, id: data.stepId }];
            });
            setNodes((n: Node[]) =>
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
        } catch (err: unknown) {
          console.error("Failed to parse SSE event", err);
        }
      };
      es.onerror = () => {
        es?.close();
        pollRunUntilDone(runId);
      };
    } catch {
      pollRunUntilDone(runId);
    }
    return () => es?.close();
  };

  const aiGenerate = async (p?: string) => {
    const prompt = p || aiPrompt;
    if (!prompt.trim()) return;
    setAiGen(true);
    try {
      const r = await api.post("/api/v1/generate/workflow", { prompt });
      const g = r.data;
      const AI_NODE_MAP: Record<string, string> = {
        "ai-agent": "aiAgentNode",
        "chat-model": "chatModelNode",
        "agent-memory": "memoryNode",
        "agent-tool": "toolNode",
      };
      const genNodes = g.nodes.map((n: any) => {
        const cid = n.componentId || n.nodeType;
        return {
          id: n.tempId,
          type: AI_NODE_MAP[cid] || "workflowNode",
          position: n.position,
          data: {
            nodeType: cid,
            componentId: cid,
            category: n.category,
            label: n.label,
            config: n.config,
          },
        };
      });
      const genEdges = g.edges.map((e: any, i: number) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
      }));
      loadWorkflow({
        name: g.name,
        description: g.description,
        status: "DRAFT",
        nodes: genNodes,
        edges: genEdges,
        runs: [],
      });
      setLeftTab("nodes");
      toast({
        title: "Workflow generated",
        description: `"${g.name}" with ${g.nodes.length} nodes`,
        variant: "success",
      });
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e.message,
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
      const curComponentMap = useWorkflowStore.getState().componentMap;
      const component = curComponentMap[componentId];
      const fallback =
        NODE_CFG[componentId] ||
        NODE_CFG[componentId.toUpperCase().replace(/-/g, "_")];
      // Map special component IDs to custom node types
      const CUSTOM_NODE_TYPE_MAP: Record<string, string> = {
        "ai-agent": "aiAgentNode",
        "chat-model": "chatModelNode",
        "agent-memory": "memoryNode",
        "agent-tool": "toolNode",
      };
      const reactFlowType = CUSTOM_NODE_TYPE_MAP[componentId] || "workflowNode";

      addNode({
        id: `${componentId}-${Date.now()}`,
        type: reactFlowType,
        position: pos,
        data: {
          nodeType: componentId,
          componentId,
          category: component?.category || fallback?.cat || "core",
          label: component?.name || fallback?.label || componentId,
          iconName: component?.icon,
          config: component ? getConfigDefaults(component.configFields) : {},
        },
      });
    },
    [screenToFlowPosition, NODE_CFG],
  );

  useEffect(() => {
    if (!isResizingRight) return;
    const onMove = (event: MouseEvent) => {
      const nextWidth = window.innerWidth - event.clientX;
      setRightWidth(Math.max(320, Math.min(560, nextWidth)));
    };
    const onUp = () => setIsResizingRight(false);
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizingRight]);

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

  const statusColors: Record<
    string,
    { bg: string; text: string; dot: string }
  > = {
    DRAFT: { bg: "bg-zinc-500/10", text: "text-zinc-500", dot: "bg-zinc-400" },
    ACTIVE: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      dot: "bg-emerald-500",
    },
    PAUSED: {
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      dot: "bg-amber-500",
    },
    ARCHIVED: {
      bg: "bg-zinc-500/10",
      text: "text-zinc-500",
      dot: "bg-zinc-500",
    },
  };
  const sc = statusColors[wfStatus] || statusColors.DRAFT;

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ─── Top Bar ──── */}
      <header
        className="flex items-center justify-between px-3 py-0 h-12 border-b z-30 shrink-0"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Left: back + workspace breadcrumb + workflow name */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Workspace mini-switcher */}
          <div className="relative">
            <button
              onClick={() => setWsSwitcherOpen(!wsSwitcherOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: "var(--text-secondary)" }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: "rgba(99,102,241,0.7)" }}
              >
                {activeWorkspace?.name.charAt(0).toUpperCase() || "?"}
              </div>
              <span className="hidden sm:block max-w-[80px] truncate">
                {activeWorkspace?.name || "No Workspace"}
              </span>
              <ChevronsUpDown className="w-2.5 h-2.5 opacity-40" />
            </button>

            <AnimatePresence>
              {wsSwitcherOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 w-48 rounded-xl border shadow-xl z-50 overflow-hidden"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="p-1">
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspace(ws);
                          setWsSwitcherOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/5 transition-colors"
                      >
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ background: "rgba(99,102,241,0.7)" }}
                        >
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className="text-xs truncate flex-1"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {ws.name}
                        </span>
                        {activeWorkspace?.id === ws.id && (
                          <Check className="w-3 h-3 text-indigo-500" />
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
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/5 transition-colors"
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

          <span style={{ color: "var(--border-medium)" }}>/</span>

          <input
            value={wfName}
            onChange={(e) => setWfName(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="text-sm font-semibold bg-transparent border-none outline-none w-44 truncate"
            style={{ color: "var(--text-primary)" }}
            disabled={!hasWorkspace}
          />
        </div>

        {/* Center: mode tabs */}
        <div
          className="flex items-center gap-0.5 rounded-lg p-0.5 border"
          style={{
            background: "var(--bg-hover)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {(["design", "runs", "logs"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setActiveMode(t);
                if ((t === "runs" || t === "logs") && !activeRun && runs.length > 0) {
                  fetchRunDetails(runs[0].id);
                }
              }}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
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

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
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
            disabled={saving || !hasWorkspace}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 hover:bg-white/5"
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
            Save
          </button>
          <button
            onClick={exec}
            disabled={executing || isNew || !hasWorkspace}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {executing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            Run
          </button>
          {stoppableRunId && (
            <button
              type="button"
              onClick={cancelStoppableRun}
              disabled={cancelling || isNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 hover:bg-white/5"
              style={{
                borderColor: "var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
              title="Stop the in-progress run (even if you are viewing another run)"
            >
              {cancelling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Square className="w-3 h-3 fill-current" />
              )}
              Stop
            </button>
          )}
        </div>
      </header>

      {/* ─── No workspace state ──── */}
      {!hasWorkspace && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(99,102,241,0.08)" }}
            >
              <Building2 className="w-8 h-8 text-indigo-500" />
            </div>
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Create a Workspace First
            </h2>
            <p
              className="text-sm mb-5 leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Workspaces organize your workflows and team. You need one to start
              building.
            </p>
            <button
              onClick={() => setShowWorkspaceModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              Create Workspace
            </button>
          </div>
        </div>
      )}

      {/* ─── Editor area ──── */}
      {hasWorkspace && (
        <div className="flex-1 flex overflow-hidden relative">
          {/* ── Left Panel ── */}
          {activeMode === "design" && (
            <AnimatePresence initial={false}>
              {leftOpen ? (
                <motion.div
                  key="left-open"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 256, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="shrink-0 border-r flex flex-col overflow-hidden"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  {/* Left panel header */}
                  <div
                    className="flex items-center justify-between border-b px-2 py-1.5 shrink-0"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div className="flex items-center gap-0">
                      {(
                        [
                          { id: "ai" as const, icon: Sparkles, label: "AI" },
                          { id: "nodes" as const, icon: Plus, label: "Nodes" },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setLeftTab(t.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background:
                              leftTab === t.id
                                ? "rgba(99,102,241,0.08)"
                                : "transparent",
                            color:
                              leftTab === t.id
                                ? "#6366f1"
                                : "var(--text-muted)",
                          }}
                        >
                          <t.icon className="w-3.5 h-3.5" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setLeftOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      title="Collapse panel"
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </button>
                  </div>

                  {/* AI Generator */}
                  {leftTab === "ai" && (
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Describe your workflow in plain English..."
                        rows={4}
                        className="w-full p-2.5 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--input-border)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <button
                        onClick={() => aiGenerate()}
                        disabled={aiGen || !aiPrompt.trim()}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                      >
                        {aiGen ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {aiGen ? "Generating..." : "Generate Workflow"}
                      </button>
                      <div className="space-y-1">
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider px-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Quick prompts
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
                            className="w-full text-left text-[11px] p-2 rounded-lg transition-colors hover:bg-white/5"
                            style={{ color: "var(--text-muted)" }}
                          >
                            &quot;{p}&quot;
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Node palette */}
                  {leftTab === "nodes" && (
                    <div className="flex-1 overflow-y-auto">
                      {components.length === 0 && !loading && (
                        <div className="p-4 text-center" style={{ color: "var(--text-muted)" }}>
                          <p className="text-sm">No components available</p>
                          <p className="text-xs mt-1">Check your backend connection</p>
                        </div>
                      )}
                      {(components.length > 0
                        ? Object.entries(
                            groupComponentsByCategory(components),
                          ).map(([cat, items]) => ({
                            cat,
                            items: items.map((it) => ({
                              key: it.id,
                              label: it.name,
                              icon: resolveIcon(it.icon),
                              color: categoryColor(it.category),
                              dragId: it.id,
                            })),
                          }))
                        : Object.entries(
                            Object.entries(LEGACY_NODE_CFG).reduce<
                              Record<string, any[]>
                            >((acc, [key, val]) => {
                              (acc[val.cat] = acc[val.cat] || []).push({
                                key,
                                label: val.label,
                                icon: val.icon,
                                color: val.color,
                                dragId: key,
                              });
                              return acc;
                            }, {}),
                          ).map(([cat, items]) => ({ cat, items }))
                      ).map(({ cat, items }, groupIdx, all) => (
                        <div key={cat}>
                          <div
                            className="px-4 pt-4 pb-2"
                            style={{
                              borderTop:
                                groupIdx > 0
                                  ? "1px solid var(--border-subtle)"
                                  : "none",
                            }}
                          >
                            <p
                              className="text-[11px] font-bold uppercase tracking-widest"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {components.length > 0
                                ? categoryLabel(cat as ComponentCategory)
                                : cat.replace(/_/g, " ")}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 px-3 pb-2">
                            {items.map((item: any) => {
                              const Icon = item.icon;
                              return (
                                <div
                                  key={item.key}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData(
                                      "componentId",
                                      item.dragId,
                                    );
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  className="flex flex-col items-center p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all group"
                                  style={{
                                    border: "1px solid var(--border-subtle)",
                                    background: "var(--bg-card)",
                                  }}
                                  onMouseEnter={(e) => {
                                    (
                                      e.currentTarget as HTMLElement
                                    ).style.borderColor =
                                      "rgba(99,102,241,0.4)";
                                    (
                                      e.currentTarget as HTMLElement
                                    ).style.background =
                                      "rgba(99,102,241,0.04)";
                                  }}
                                  onMouseLeave={(e) => {
                                    (
                                      e.currentTarget as HTMLElement
                                    ).style.borderColor =
                                      "var(--border-subtle)";
                                    (
                                      e.currentTarget as HTMLElement
                                    ).style.background = "var(--bg-card)";
                                  }}
                                >
                                  <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-2"
                                    style={{
                                      backgroundColor: `${item.color}18`,
                                      color: item.color,
                                    }}
                                  >
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <span
                                    className="text-[11px] font-medium text-center leading-tight"
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    {item.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="left-closed"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 36, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="shrink-0 border-r flex flex-col items-center pt-2 gap-2"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <button
                    onClick={() => setLeftOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    title="Expand panel"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ── Canvas ── */}
          <div className="flex-1 relative overflow-hidden">
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
                onNodeClick={(_, n) => selectNode(n.id)}
                onPaneClick={() => clearSelection()}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.2}
                maxZoom={2.5}
                deleteKeyCode="Backspace"
                connectionLineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
                defaultEdgeOptions={{
                  animated: true,
                  style: { stroke: "#6366f1", strokeWidth: 2 },
                }}
              >
                <Background
                  color={theme === "dark" ? "#27272a" : "#e4e4e7"}
                  gap={20}
                  size={1}
                />
                <Controls showInteractive={false} />
                <MiniMap
                  nodeColor={() => "#6366f1"}
                  maskColor={
                    theme === "dark"
                      ? "rgba(9,9,11,0.8)"
                      : "rgba(250,250,250,0.8)"
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
                  fetchRunDetails(run.id);
                }}
                onRefresh={async () => {
                  if (!isNew) {
                    setAllRunsLoading(true);
                    try {
                      const r = await api.get(`/api/v1/workflows/${wfId}`);
                      setRuns(r.data.runs || []);
                    } catch (e: any) {
                      toast({
                        title: "Refresh failed",
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
              <div className="h-full flex flex-col">
                <div
                  className="px-5 py-3 border-b flex items-center gap-3 shrink-0"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <FileText className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <select
                    value={activeRun?.id || ""}
                    onChange={(e) => { if (e.target.value) fetchRunDetails(e.target.value); }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                  >
                    <option value="">Select a run...</option>
                    {runs.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        Run {r.id.substring(0, 8)} — {r.status?.toLowerCase()} — {new Date(r.startedAt || r.createdAt).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {activeRun && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      activeRun.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500" :
                      activeRun.status === "FAILED" ? "bg-red-500/10 text-red-500" :
                      activeRun.status === "RUNNING" ? "bg-blue-500/10 text-blue-500" :
                      "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      {activeRun.status?.toLowerCase().replace("_", " ")}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {!activeRun || runSteps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <FileText className="w-8 h-8 mb-2" style={{ color: "var(--text-muted)" }} />
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                        {runs.length === 0
                          ? "No runs yet. Click Run to execute the workflow."
                          : "Select a run above to view its logs."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {runSteps.map((s: any, i: number) => (
                        <div
                          key={s.id}
                          className="rounded-xl border overflow-hidden"
                          style={{
                            background: "var(--bg-card)",
                            borderColor: "var(--border-subtle)",
                          }}
                        >
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
                              >
                                {i + 1}
                              </div>
                              <div>
                                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                                  {s.node?.label || s.nodeId?.substring(0, 12)}
                                </span>
                                <span className="text-[10px] font-mono ml-2" style={{ color: "var(--text-muted)" }}>
                                  {s.node?.nodeType}
                                </span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                s.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500" :
                                s.status === "FAILED" ? "bg-red-500/10 text-red-500" :
                                s.status === "RUNNING" ? "bg-blue-500/10 text-blue-500" :
                                "bg-zinc-500/10 text-zinc-400"
                              }`}>
                                {s.status}
                              </span>
                            </div>
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {s.executionTimeMs ? `${s.executionTimeMs}ms` : ""}
                            </span>
                          </div>

                          {s.reasoningSummary && (
                            <div className="px-4 pb-2">
                              <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>AI Reasoning</p>
                              <p className="text-xs leading-relaxed p-2 rounded-lg" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                                {s.reasoningSummary}
                              </p>
                            </div>
                          )}

                          <div className="px-4 pb-3 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Input</p>
                              <pre className="p-2 rounded-lg text-[10px] font-mono max-h-32 overflow-auto" style={{ background: "var(--code-bg)", color: "var(--text-secondary)" }}>
                                {s.inputPayload ? JSON.stringify(s.inputPayload, null, 2) : "—"}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Output</p>
                              <pre className="p-2 rounded-lg text-[10px] font-mono max-h-32 overflow-auto text-emerald-500" style={{ background: "var(--code-bg)" }}>
                                {s.outputPayload ? JSON.stringify(s.outputPayload, null, 2) : "—"}
                              </pre>
                            </div>
                          </div>

                          {s.error && (
                            <div className="px-4 pb-3">
                              <div className="p-2 rounded-lg border border-red-500/20" style={{ background: "rgba(239,68,68,0.05)" }}>
                                <p className="text-xs text-red-500">{s.error}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Panel ── */}
          {activeMode === "design" && (
            <AnimatePresence initial={false}>
              {!rightOpen && (
                <motion.div
                  key="right-closed"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 36, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="shrink-0 border-l flex flex-col items-center pt-2"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <button
                    onClick={() => setRightOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    title="Expand panel"
                  >
                    <PanelRightOpen className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          {activeMode === "design" && rightOpen && (
            <motion.div
              key="right-open"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="relative shrink-0 border-l flex flex-col overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--bg-secondary) 92%, #6366f1 8%) 100%)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div
                className="absolute left-0 top-0 h-full w-2 cursor-col-resize group z-10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizingRight(true);
                }}
                title="Resize sidebar"
              >
                <div className="h-full w-px mx-auto bg-transparent group-hover:bg-indigo-500/40 transition-colors" />
              </div>
              {selNode ? (
                <div className="flex flex-col h-full">
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <button
                      onClick={() => clearSelection()}
                      className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    {(() => {
                      const cfg = NODE_CFG[selNode.data.nodeType as string] ||
                        NODE_CFG[selNode.data.componentId as string] || {
                        icon: selNode.data.iconName ? resolveIcon(selNode.data.iconName as string) : Zap,
                        color: categoryColor((selNode.data.category as string) || "core"),
                        label: "Node",
                        cat: ((selNode.data.category as string) || "ACTION").toUpperCase(),
                      };
                      const Icon = cfg.icon;
                      return (
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${cfg.color}18`,
                              color: cfg.color,
                            }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {(selNode.data.label as string) || cfg.label}
                            </p>
                            <p
                              className="text-[10px]"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {CAT_LABELS[cfg.cat] || cfg.cat.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                    <button
                      onClick={() => setRightOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                      style={{ color: "var(--text-muted)" }}
                      title="Collapse panel"
                    >
                      <PanelRightClose className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div
                      className="p-4 border-b"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <label
                        className="text-[11px] font-semibold block mb-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Label
                      </label>
                      <input
                        value={(selNode.data.label as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selNode.id, { label: e.target.value })
                        }
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Node label..."
                        className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--input-border)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>

                    {validationErrors[selNode.id]?.length ? (
                      <div
                        className="mx-4 mt-3 p-2.5 rounded-lg text-[10px] leading-relaxed"
                        style={{
                          borderColor: "rgba(239,68,68,0.3)",
                          background: "rgba(239,68,68,0.06)",
                          color: "#ef4444",
                          border: "1px solid rgba(239,68,68,0.3)",
                        }}
                      >
                        {validationErrors[selNode.id].map((err, i) => (
                          <p key={i}>{err}</p>
                        ))}
                      </div>
                    ) : null}

                    <div className="p-4">
                      <label
                        className="text-[11px] font-semibold block mb-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Configuration
                      </label>
                      {componentMap[selNode.data.componentId as string]
                        ?.description ? (
                        <p
                          className="text-[11px] leading-relaxed mb-3"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {
                            componentMap[selNode.data.componentId as string]
                              .description
                          }
                        </p>
                      ) : null}
                      {componentMap[selNode.data.componentId as string]?.configFields?.length ? (
                        <NodeConfigForm
                          nodeType={selNode.data.nodeType as string}
                          fields={
                            componentMap[selNode.data.componentId as string]
                              ?.configFields || []
                          }
                          config={
                            (selNode.data.config as Record<string, any>) || {}
                          }
                          onChange={(config) =>
                            updateNodeData(selNode.id, { config })
                          }
                          errors={validationErrors[selNode.id] || []}
                          workspaceId={activeWorkspace?.id ?? ""}
                        />
                      ) : (
                        <div className="p-4 rounded-lg text-center" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                          <AlertCircle className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                          <p className="text-sm font-medium">No configuration fields</p>
                          <p className="text-xs mt-1">This node type has no configurable settings.</p>
                        </div>
                      )}
                      {(String(selNode.data.componentId) === "entry-point" ||
                        String(selNode.data.nodeType || "")
                          .toLowerCase()
                          .replace(/_/g, "-") === "entry-point") && (
                        <p
                          className="mt-3 text-[10px] font-mono break-all leading-relaxed"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <span className="font-sans font-medium not-italic mr-1">
                            Preview:
                          </span>
                          {JSON.stringify({
                            text: String(
                              (selNode.data.config as Record<string, unknown>)
                                ?.testRunPlainText ?? "",
                            ),
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="p-4 border-t shrink-0"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <button
                      onClick={() => deleteNode(selNode.id)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-medium transition-colors hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                      style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-muted)",
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Node
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full overflow-y-auto">
                  <div
                    className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Workflow
                    </p>
                    <button
                      onClick={() => setRightOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      title="Collapse panel"
                    >
                      <PanelRightClose className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    className="px-4 py-4 border-b"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Status
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                        />
                        {wfStatus.charAt(0) + wfStatus.slice(1).toLowerCase()}
                      </span>
                      {wfStatus === "ACTIVE" ? (
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/api/v1/workflows/${wfId}`, { status: "PAUSED" });
                              setWfStatus("PAUSED");
                              toast({ title: "Workflow paused", variant: "success" });
                            } catch (err: any) {
                              console.error("Failed to pause workflow", err);
                              toast({ title: "Failed to pause", description: err.message, variant: "destructive" });
                            }
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-500"
                          style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/api/v1/workflows/${wfId}`, { status: "ACTIVE" });
                              setWfStatus("ACTIVE");
                              toast({ title: "Workflow activated", variant: "success" });
                            } catch (err: any) {
                              console.error("Failed to activate workflow", err);
                              toast({ title: "Failed to activate", description: err.message, variant: "destructive" });
                            }
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500"
                          style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    className="px-4 py-4 border-b"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Workflow name
                    </label>
                    <input
                      value={wfName}
                      onChange={(e) => setWfName(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  <div
                    className="border-b"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Description
                      </span>
                      <ChevronDown
                        className="w-4 h-4 transition-transform"
                        style={{
                          color: "var(--text-muted)",
                          transform: descExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      />
                    </button>
                    <AnimatePresence>
                      {descExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4">
                            <textarea
                              value={wfDesc}
                              onChange={(e) => setWfDesc(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="Describe what this workflow does..."
                              rows={3}
                              className="w-full px-3 py-2 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                              style={{
                                background: "var(--input-bg)",
                                border: "1px solid var(--input-border)",
                                color: "var(--text-primary)",
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div
                    className="border-b"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <button className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/3 transition-colors">
                      <Tag
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        + Add tags
                      </span>
                    </button>
                  </div>

                  <div className="px-4 py-4">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Overview
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: "Nodes", value: nodes.length },
                        { label: "Connections", value: edges.length },
                        { label: "Runs", value: runs.length },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="flex items-center justify-between"
                        >
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {stat.label}
                          </span>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto px-4 pb-4">
                    <p
                      className="text-[10px] leading-relaxed"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Click any node on the canvas to edit its configuration.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

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
