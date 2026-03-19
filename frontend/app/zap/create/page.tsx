"use client";

import { BACKEND_URL } from "@/app/config";
// removed appbar import
import { PrimaryButton } from "@/components/buttons/PrimaryButton";
import { Input } from "@/components/Input";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  Node,
  Edge,
  NodeProps,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  X,
  Server,
  LayoutTemplate,
  Send,
  ArrowRight,
  Wallet,
  Mail,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WorkflowNode,
  NodePalette,
  WorkflowTemplates,
  AIWorkflowGenerator,
  WorkflowExplanation,
  generateWorkflowSteps,
  NODE_TYPES as WORKFLOW_NODE_TYPES,
  NODE_CATEGORIES,
  WORKFLOW_TEMPLATES,
  getNodesByCategory,
  getNodeById,
  getAllNodeTypes,
} from "@/components/workflow";

export interface AppItem {
  id: string;
  name: string;
  image: string;
}

export interface ZapNodeData extends Record<string, unknown> {
  type: string;
  config: AppItem | null;
  selected: boolean;
  metadata: Record<string, any>;
}

export type ZapNode = Node<ZapNodeData>;

const CustomNode = ({ data, isConnectable }: NodeProps<ZapNode>) => {
  const isTrigger = data.type === "trigger";
  return (
    <div
      className={cn(
        "rounded-xl shadow-lg border-2 bg-white w-[300px] flex items-center p-4 transition-all hover:shadow-xl",
        data.selected
          ? "border-blue-500 shadow-blue-500/20"
          : "border-slate-200",
        isTrigger ? "border-amber-400 border-2" : "",
      )}
    >
      {/* Target handle for actions */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-slate-400 border-2 border-white"
          isConnectable={isConnectable}
        />
      )}

      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shrink-0 mr-4 text-white",
          isTrigger ? "bg-amber-500" : "bg-blue-500",
        )}
      >
        {isTrigger ? (
          <Zap className="w-6 h-6" />
        ) : (
          <LayoutTemplate className="w-6 h-6" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 text-base truncate">
          {data.config?.name ||
            (isTrigger ? "Select Trigger" : "Select Action")}
        </h3>
        <p className="text-sm text-slate-500 truncate">
          {data.config?.name ? "Configured" : "Needs setup"}
        </p>
      </div>

      {/* Connected dot indicator */}
      {data.config?.name && (
        <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 ml-2" />
      )}

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-slate-400 border-2 border-white"
        isConnectable={isConnectable}
      />
    </div>
  );
};

const NODE_TYPES = {
  customTask: CustomNode,
};

function useAvailableActionsAndTriggers() {
  const [availableActions, setAvailableActions] = useState<AppItem[]>([]);
  const [availableTriggers, setAvailableTriggers] = useState<AppItem[]>([]);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/v1/trigger/available`)
      .then((x) => setAvailableTriggers(x.data.availableTriggers))
      .catch((e) => console.error(e));

    axios
      .get(`${BACKEND_URL}/api/v1/action/available`)
      .then((x) => setAvailableActions(x.data.availableActions))
      .catch((e) => console.error(e));
  }, []);

  return {
    availableActions,
    availableTriggers,
  };
}

function WorkflowEditor() {
  const router = useRouter();
  const { availableActions, availableTriggers } =
    useAvailableActionsAndTriggers();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes] = useState<ZapNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // New state for AI features
  const [viewMode, setViewMode] = useState<"manual" | "templates" | "ai">(
    "manual",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflowGenerated, setWorkflowGenerated] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);

  const onNodesChange: OnNodesChange<ZapNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange: OnEdgesChange<Edge> = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect: OnConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      ),
    [],
  );

  // AI Workflow Generation
  const handleGenerateWorkflow = async (description: string) => {
    setIsGenerating(true);
    setAiError(null);

    try {
      // Simulate AI generation (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate a sample workflow based on description
      const generatedNodes = generateSampleWorkflow(description);
      setNodes(generatedNodes.nodes);
      setEdges(generatedNodes.edges);
      setWorkflowGenerated(true);
      setViewMode("manual");
    } catch (error) {
      setAiError("Failed to generate workflow. Please try again.");
      console.error("Error generating workflow:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSampleWorkflow = (description: string) => {
    // This is a placeholder - in production, call your AI API
    const nodeId = Date.now();
    return {
      nodes: [
        {
          id: `node-${nodeId}`,
          type: "customTask",
          position: { x: 250, y: 50 },
          data: {
            type: "entry-point",
            config: {
              id: "entry-point",
              name: "Webhook Trigger",
              image: "",
            },
            selected: false,
            metadata: {},
          },
        },
        {
          id: `node-${nodeId + 1}`,
          type: "customTask",
          position: { x: 250, y: 200 },
          data: {
            type: "ai-agent",
            config: {
              id: "ai-agent",
              name: "Classification Agent",
              image: "",
            },
            selected: false,
            metadata: {},
          },
        },
        {
          id: `node-${nodeId + 2}`,
          type: "customTask",
          position: { x: 250, y: 350 },
          data: {
            type: "slack-send",
            config: { id: "slack-send", name: "Slack", image: "" },
            selected: false,
            metadata: {},
          },
        },
      ] as ZapNode[],
      edges: [
        {
          id: `edge-${nodeId}`,
          source: `node-${nodeId}`,
          target: `node-${nodeId + 1}`,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed } as any,
        },
        {
          id: `edge-${nodeId + 1}`,
          source: `node-${nodeId + 1}`,
          target: `node-${nodeId + 2}`,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed } as any,
        },
      ] as Edge[],
    };
  };

  const handleExplainWorkflow = () => {
    setShowExplanation(true);
    const steps = generateWorkflowSteps(nodes);
    setWorkflowSteps(steps);
  };

  const handleTemplateSelect = (template: any) => {
    // Generate workflow from template
    const generatedNodes = generateTemplateWorkflow(template);
    setNodes(generatedNodes.nodes);
    setEdges(generatedNodes.edges);
    setWorkflowGenerated(true);
    setViewMode("manual");
  };

  const generateTemplateWorkflow = (template: any) => {
    const nodeId = Date.now();
    return {
      nodes: template.nodes.map((nodeType: string, index: number) => ({
        id: `node-${nodeId}-${index}`,
        type: "customTask",
        position: { x: 250, y: 50 + index * 150 },
        data: {
          type: nodeType,
          config: getNodeById(nodeType)
            ? { id: nodeType, name: getNodeById(nodeType)!.name, image: "" }
            : null,
          selected: false,
          metadata: {},
        },
      })) as ZapNode[],
      edges: template.nodes.slice(0, -1).map((_: any, index: number) => ({
        id: `edge-${nodeId}-${index}`,
        source: `node-${nodeId}-${index}`,
        target: `node-${nodeId}-${index + 1}`,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed } as any,
      })) as Edge[],
    };
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const subtype = event.dataTransfer.getData("application/subtype");
      const baseId = event.dataTransfer.getData("application/id");
      const name = event.dataTransfer.getData("application/name");
      const image = event.dataTransfer.getData("application/image");

      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `${type}-${Math.random().toString(36).substring(7)}`;

      const newNode: ZapNode = {
        id: newNodeId,
        type: "customTask",
        position,
        data: {
          type,
          config: subtype ? { id: baseId, name, image } : null,
          selected: false,
          metadata: {},
        },
      };

      setNodes((nds) =>
        [...nds, newNode].map((n) => ({
          ...n,
          data: { ...n.data, selected: n.id === newNodeId },
        })),
      );
      setActiveNodeId(newNodeId);
    },
    [screenToFlowPosition],
  );

  const onNodeClick = (_: React.MouseEvent, node: ZapNode) => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === node.id },
      })),
    );
    setActiveNodeId(node.id);
  };

  const onPaneClick = () => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, selected: false },
      })),
    );
    setActiveNodeId(null);
  };

  const activeNode = activeNodeId
    ? nodes.find((n) => n.id === activeNodeId)
    : null;

  const handleUpdateNode = (
    nodeId: string,
    config: AppItem | null,
    metadata: Record<string, unknown>,
  ) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: { ...n.data, config, metadata },
          };
        }
        return n;
      }),
    );
  };

  const validateAndPublish = async () => {
    // Traverse edges to build sequential zap
    const triggerNodes = nodes.filter((n) => n.data.type === "trigger");

    if (triggerNodes.length === 0) {
      alert("You must have exactly one Trigger on the canvas.");
      return;
    }
    if (triggerNodes.length > 1) {
      alert("Multiple triggers found. Please have only one trigger.");
      return;
    }

    const triggerNode = triggerNodes[0];
    if (!triggerNode.data.config?.id) {
      alert("Please configure the Trigger.");
      return;
    }

    // Traverse the graph from the trigger node
    const actionsPipeline = [];
    let currentNodeId = triggerNode.id;

    while (true) {
      // Find outgoing edge
      const outgoingEdge = edges.find((e) => e.source === currentNodeId);
      if (!outgoingEdge) {
        break; // End of pipeline
      }

      const nextNode = nodes.find((n) => n.id === outgoingEdge.target);
      if (!nextNode) {
        break;
      }

      if (nextNode.data.type !== "action") {
        alert("Triggers can only connect to actions.");
        return;
      }

      if (!nextNode.data.config?.id) {
        alert(`Action in the pipeline is not fully configured.`);
        return;
      }

      actionsPipeline.push(nextNode);
      currentNodeId = nextNode.id;
    }

    if (
      actionsPipeline.length === 0 &&
      Array.from(new Set(nodes.map((n) => n.data.type))).includes("action")
    ) {
      alert(
        "You have actions on canvas but they are not connected to the trigger.",
      );
      return;
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      alert("You must be logged in to publish.");
      router.push("/login");
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/v1/zap`,
        {
          availableTriggerId: triggerNode.data.config!.id,
          triggerMetadata: triggerNode.data.metadata || {},
          actions: actionsPipeline.map((a) => ({
            availableActionId: a.data.config!.id,
            actionMetadata: a.data.metadata || {},
          })),
        },
        {
          headers: {
            Authorization: token,
          },
        },
      );

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to publish zap. Check the console.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <div className="flex justify-between items-center bg-white border-b border-slate-200 px-6 py-4 shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
            title="Back to Dashboard"
          >
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-slate-800 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Workflow Builder
            </h1>
            <p className="text-sm text-slate-500">
              Build workflows manually or with AI
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 space-x-1">
            <button
              onClick={() => setViewMode("manual")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === "manual"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setViewMode("templates")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === "templates"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setViewMode("ai")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                viewMode === "ai"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>AI Mode</span>
            </button>
          </div>
          <div className="border-l border-slate-200 h-6 mx-2" />
          <PrimaryButton onClick={validateAndPublish}>
            <span className="flex items-center space-x-2">
              <Zap className="w-4 h-4 mr-2" /> Publish Pipeline
            </span>
          </PrimaryButton>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* AI/Template View */}
        {(viewMode === "templates" || viewMode === "ai") && (
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 p-8">
            {viewMode === "ai" ? (
              <AIWorkflowGenerator
                onGenerateWorkflow={handleGenerateWorkflow}
                onExplainWorkflow={handleExplainWorkflow}
                isGenerating={isGenerating}
                workflowGenerated={workflowGenerated}
                error={aiError}
              />
            ) : (
              <WorkflowTemplates
                onSelectTemplate={() => {}}
                onGenerateWorkflow={handleTemplateSelect}
              />
            )}
          </div>
        )}

        {/* Workflow Explanation Modal */}
        {showExplanation && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">
                  Workflow Explanation
                </h2>
                <button
                  onClick={() => setShowExplanation(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <WorkflowExplanation
                  isOpen={true}
                  steps={workflowSteps}
                  workflowName="Generated Workflow"
                  workflowDescription="AI-generated workflow based on your description"
                />
              </div>
            </div>
          </div>
        )}
        {/* LEFT SIDEBAR: Components Canvas - Only show in manual mode */}
        {viewMode === "manual" && (
          <div className="w-[300px] bg-white border-r border-slate-200 flex flex-col z-20 shadow-[2px_0_15px_rgba(0,0,0,0.03)] hidden md:flex">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800">Components</h2>
              <p className="text-xs text-slate-500">Drag and drop to canvas</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Triggers Category */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Triggers
                </h3>

                {/* Generic Trigger Placeholder */}
                <div
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", "trigger");
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  draggable
                  className="flex items-center p-3 mb-2 border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-amber-400 hover:shadow-sm bg-white transition-all group"
                >
                  <GripVertical className="w-4 h-4 text-slate-300 mr-2" />
                  <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center text-amber-500 mr-3">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-amber-600">
                    Empty Trigger
                  </span>
                </div>

                {availableTriggers.map((t) => (
                  <div
                    key={`t-${t.id}`}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/reactflow",
                        "trigger",
                      );
                      e.dataTransfer.setData("application/subtype", "true");
                      e.dataTransfer.setData("application/id", t.id);
                      e.dataTransfer.setData("application/name", t.name);
                      e.dataTransfer.setData("application/image", t.image);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    draggable
                    className="flex items-center p-3 mb-2 border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-amber-400 hover:shadow-sm bg-white transition-all group"
                  >
                    <GripVertical className="w-4 h-4 text-slate-300 mr-2" />
                    <img
                      src={t.image}
                      className="w-8 h-8 rounded object-cover mr-3 bg-slate-50 border border-slate-100"
                    />
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-amber-600">
                      {t.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions Category */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-blue-500">
                  Actions
                </h3>

                {/* Generic Action Placeholder */}
                <div
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", "action");
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  draggable
                  className="flex items-center p-3 mb-2 border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-sm bg-white transition-all group"
                >
                  <GripVertical className="w-4 h-4 text-slate-300 mr-2" />
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                    <LayoutTemplate className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">
                    Empty Action
                  </span>
                </div>

                {availableActions.map((a) => (
                  <div
                    key={`a-${a.id}`}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "action");
                      e.dataTransfer.setData("application/subtype", "true");
                      e.dataTransfer.setData("application/id", a.id);
                      e.dataTransfer.setData("application/name", a.name);
                      e.dataTransfer.setData("application/image", a.image);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    draggable
                    className="flex items-center p-3 mb-2 border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-sm bg-white transition-all group"
                  >
                    <GripVertical className="w-4 h-4 text-slate-300 mr-2" />
                    <img
                      src={a.image}
                      className="w-8 h-8 rounded object-cover mr-3 bg-slate-50 border border-slate-100"
                    />
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">
                      {a.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Flow Canvas - Only show in manual mode */}
        {viewMode === "manual" && (
          <div className="flex-1 relative h-full" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={NODE_TYPES}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.5}
              maxZoom={1.5}
              className="bg-[#f0f4f8]"
            >
              {/* Minimalist dots background */}
              <Background color="#cbd5e1" gap={20} size={2} />
              <Controls className="!mb-6 !ml-6" />
            </ReactFlow>

            {nodes.length === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none text-slate-400 flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                  <LayoutTemplate className="w-8 h-8 text-slate-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-600 mb-2">
                  Build your workflow
                </h2>
                <p>
                  Drag any trigger or action from the left sidebar onto this
                  canvas.
                </p>
                <div className="mt-4 text-sm">
                  <span className="text-purple-600 font-medium">Or</span> switch
                  to{" "}
                  <button
                    onClick={() => setViewMode("ai")}
                    className="text-purple-600 font-semibold hover:underline"
                  >
                    AI Mode
                  </button>{" "}
                  to generate with AI
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT SIDEBAR: Configuration - Only show in manual mode */}
        {viewMode === "manual" && (
          <AnimatePresence>
            {activeNode && (
              <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-[400px] border-l border-slate-200 bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20 overflow-y-auto flex flex-col h-full absolute right-0 top-0 bottom-0"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      {activeNode.data.type === "trigger"
                        ? "Configure Trigger"
                        : "Configure Action"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      Edit integration settings
                    </p>
                  </div>
                  <button
                    onClick={onPaneClick}
                    className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 flex-1 bg-white">
                  <NodeConfigurator
                    node={activeNode}
                    availableTriggers={availableTriggers}
                    availableActions={availableActions}
                    onUpdate={(config, metadata) =>
                      handleUpdateNode(activeNode.id, config, metadata)
                    }
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Side Panel Component Contextual UI
function NodeConfigurator({
  node,
  availableTriggers,
  availableActions,
  onUpdate,
}: {
  node: ZapNode;
  availableTriggers: AppItem[];
  availableActions: AppItem[];
  onUpdate: (config: AppItem | null, metadata: Record<string, any>) => void;
}) {
  const isTrigger = node.data.type === "trigger";
  const items = isTrigger ? availableTriggers : availableActions;
  const currentConfigId = node.data.config?.id;

  const [localMeta, setLocalMeta] = useState<Record<string, any>>(
    node.data.metadata || {},
  );

  useEffect(() => {
    setLocalMeta(node.data.metadata || {});
  }, [node.id, node.data.metadata]);

  const handleSelect = (item: AppItem) => {
    onUpdate(item, {});
  };

  const handleMetaChange = (key: string, val: string) => {
    const newMeta = { ...localMeta, [key]: val };
    setLocalMeta(newMeta);
    onUpdate(node.data.config as AppItem | null, newMeta);
  };

  if (!currentConfigId) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Select {isTrigger ? "App Event" : "Action"}
        </h3>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleSelect(item)}
            className="flex items-center p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group bg-white"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-10 h-10 rounded-lg mr-4 object-cover border border-slate-100 bg-slate-50 p-1"
            />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                {item.name}
              </p>
              <p className="text-xs text-slate-500">Connect to {item.name}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
          </div>
        ))}
      </div>
    );
  }

  const selectedItem = items.find((i) => i.id === currentConfigId);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <img
          src={selectedItem?.image}
          alt={selectedItem?.name}
          className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white p-1"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800">{selectedItem?.name}</h3>
          <p className="text-xs text-blue-600 font-medium">
            {isTrigger ? "Source Event" : "Output Action"}
          </p>
        </div>
        <button
          onClick={() => onUpdate(null, {})}
          className="text-sm text-slate-500 hover:text-red-500 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
        >
          Change
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200">
          <h4 className="font-semibold text-slate-700 flex items-center">
            <Server className="w-4 h-4 mr-2" /> Parameters
          </h4>
        </div>
        <div className="p-5 space-y-4">
          {currentConfigId === "email" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  <Mail className="w-4 h-4 mr-1 text-slate-400" /> Recipient
                  Email
                </label>
                <input
                  type="email"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="john@example.com"
                  value={localMeta.email || ""}
                  onChange={(e) => handleMetaChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  <LayoutTemplate className="w-4 h-4 mr-1 text-slate-400" />{" "}
                  Message Body
                </label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[120px]"
                  placeholder="Hello, thanks for signing up!"
                  value={localMeta.body || ""}
                  onChange={(e) => handleMetaChange("body", e.target.value)}
                />
              </div>
            </div>
          )}

          {currentConfigId === "send-sol" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  <Wallet className="w-4 h-4 mr-1 text-slate-400" /> Wallet
                  Address
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Base58 Solana Address"
                  value={localMeta.address || ""}
                  onChange={(e) => handleMetaChange("address", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  <Zap className="w-4 h-4 mr-1 text-amber-400" /> SOL Amount
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0.01"
                  value={localMeta.amount || ""}
                  onChange={(e) => handleMetaChange("amount", e.target.value)}
                />
              </div>
            </div>
          )}

          {currentConfigId === "webhook" && (
            <div className="text-sm text-slate-600 space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center text-blue-700 font-medium mb-1">
                <Server className="w-4 h-4 mr-2" /> Webhook URL
              </div>
              <p>
                A unique, secure Webhook URL will be automatically generated
                upon workflow publish.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Send a POST request with JSON payload to explicitly trigger this
                flow.
              </p>
            </div>
          )}

          {!["email", "send-sol", "webhook"].includes(currentConfigId) && (
            <div className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No additional configuration required for this app.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap in provider
export default function Page() {
  return (
    <ReactFlowProvider>
      <WorkflowEditor />
    </ReactFlowProvider>
  );
}
