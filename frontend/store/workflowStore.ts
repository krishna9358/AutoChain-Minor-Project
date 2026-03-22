import { create } from "zustand";
import { temporal } from "zundo";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import type { ComponentDefinition } from "@/components/workflow/config/componentCatalog";

// ─── Types ──────────────────────────────────────────────────────
export interface WorkflowState {
  // Core workflow data
  nodes: Node[];
  edges: Edge[];
  wfName: string;
  wfDesc: string;
  wfStatus: string;
  isDirty: boolean;
  lastSavedAt: number | null;

  // Selection
  selNodeId: string | null;

  // Execution state
  runs: any[];
  activeRun: any | null;
  runSteps: any[];

  // Catalog
  components: ComponentDefinition[];
  componentMap: Record<string, ComponentDefinition>;
  validationErrors: Record<string, string[]>;
}

export interface WorkflowActions {
  // ReactFlow handlers
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Selection
  selectNode: (id: string | null) => void;
  clearSelection: () => void;

  // Workflow metadata
  setWfName: (name: string) => void;
  setWfDesc: (desc: string) => void;
  setWfStatus: (status: string) => void;

  // Node operations
  addNode: (node: Node) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;

  // Dirty / saved tracking
  markSaved: () => void;
  markDirty: () => void;

  // Catalog
  setCatalog: (
    components: ComponentDefinition[],
    componentMap: Record<string, ComponentDefinition>,
  ) => void;
  setValidationErrors: (errors: Record<string, string[]>) => void;

  // Runs
  setRuns: (runs: any[] | ((prev: any[]) => any[])) => void;
  setActiveRun: (run: any | ((prev: any) => any)) => void;
  setRunSteps: (steps: any[] | ((prev: any[]) => any[])) => void;

  // Bulk load
  loadWorkflow: (data: {
    name: string;
    description: string;
    status: string;
    nodes: Node[];
    edges: Edge[];
    runs: any[];
  }) => void;

  // Reset
  reset: () => void;
}

export type WorkflowStore = WorkflowState & WorkflowActions;

// ─── Default edge style ─────────────────────────────────────────
const EDGE_STYLE = { stroke: "#6366f1", strokeWidth: 2 };
const EDGE_MARKER = {
  type: MarkerType.ArrowClosed as const,
  color: "#6366f1",
  width: 14,
  height: 14,
};

// ─── Initial state ──────────────────────────────────────────────
const initialState: WorkflowState = {
  nodes: [],
  edges: [],
  wfName: "Untitled Workflow",
  wfDesc: "",
  wfStatus: "DRAFT",
  isDirty: false,
  lastSavedAt: null,
  selNodeId: null,
  runs: [],
  activeRun: null,
  runSteps: [],
  components: [],
  componentMap: {},
  validationErrors: {},
};

// ─── Store ──────────────────────────────────────────────────────
export const useWorkflowStore = create<WorkflowStore>()(
  temporal(
    (set, get) => ({
      ...initialState,

      // ── ReactFlow handlers ──
      setNodes: (nodesOrFn) =>
        set((s) => ({
          nodes:
            typeof nodesOrFn === "function" ? nodesOrFn(s.nodes) : nodesOrFn,
          isDirty: true,
        })),

      setEdges: (edgesOrFn) =>
        set((s) => ({
          edges:
            typeof edgesOrFn === "function" ? edgesOrFn(s.edges) : edgesOrFn,
          isDirty: true,
        })),

      onNodesChange: (changes) =>
        set((s) => ({
          nodes: applyNodeChanges(changes, s.nodes),
          isDirty: true,
        })),

      onEdgesChange: (changes) =>
        set((s) => ({
          edges: applyEdgeChanges(changes, s.edges),
          isDirty: true,
        })),

      onConnect: (connection) =>
        set((s) => ({
          edges: addEdge(
            {
              ...connection,
              animated: true,
              style: EDGE_STYLE,
              markerEnd: EDGE_MARKER,
            },
            s.edges,
          ),
          isDirty: true,
        })),

      // ── Selection ──
      selectNode: (id) => set({ selNodeId: id }),
      clearSelection: () => set({ selNodeId: null }),

      // ── Workflow metadata ──
      setWfName: (name) => set({ wfName: name, isDirty: true }),
      setWfDesc: (desc) => set({ wfDesc: desc, isDirty: true }),
      setWfStatus: (status) => set({ wfStatus: status }),

      // ── Node operations ──
      addNode: (node) =>
        set((s) => ({ nodes: [...s.nodes, node], isDirty: true })),

      deleteNode: (id) =>
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          selNodeId: s.selNodeId === id ? null : s.selNodeId,
          isDirty: true,
        })),

      updateNodeData: (id, data) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
          ),
          isDirty: true,
        })),

      // ── Dirty / saved tracking ──
      markSaved: () => set({ isDirty: false, lastSavedAt: Date.now() }),
      markDirty: () => set({ isDirty: true }),

      // ── Catalog ──
      setCatalog: (components, componentMap) =>
        set({ components, componentMap }),

      setValidationErrors: (errors) => set({ validationErrors: errors }),

      // ── Runs ──
      setRuns: (runsOrFn) =>
        set((s) => ({
          runs: typeof runsOrFn === "function" ? runsOrFn(s.runs) : runsOrFn,
        })),

      setActiveRun: (runOrFn) =>
        set((s) => ({
          activeRun:
            typeof runOrFn === "function" ? runOrFn(s.activeRun) : runOrFn,
        })),

      setRunSteps: (stepsOrFn) =>
        set((s) => ({
          runSteps:
            typeof stepsOrFn === "function" ? stepsOrFn(s.runSteps) : stepsOrFn,
        })),

      // ── Bulk load ──
      loadWorkflow: (data) =>
        set({
          wfName: data.name,
          wfDesc: data.description,
          wfStatus: data.status,
          nodes: data.nodes,
          edges: data.edges,
          runs: data.runs,
          isDirty: false,
          lastSavedAt: Date.now(),
        }),

      // ── Reset ──
      reset: () => set(initialState),
    }),
    {
      // Only track nodes and edges for undo/redo
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
      limit: 50,
    },
  ),
);
