import type { Node, Edge } from "@xyflow/react";

export interface NodeIssue {
  nodeId: string;
  nodeLabel: string;
  severity: "error" | "warning";
  message: string;
}

/**
 * Required connections for specific node types.
 * Each entry maps a node type to the handles that must be connected.
 */
const REQUIRED_CONNECTIONS: Record<
  string,
  { handleId: string; handleType: "source" | "target"; label: string }[]
> = {
  "ai-agent": [
    { handleId: "chatModel", handleType: "target", label: "Chat Model" },
    { handleId: "input", handleType: "target", label: "Input" },
  ],
};

/**
 * Required config fields for node types.
 */
const REQUIRED_CONFIG: Record<string, { key: string; label: string }[]> = {
  "ai-agent": [
    { key: "systemPrompt", label: "System Prompt" },
    { key: "userPromptTemplate", label: "User Prompt Template" },
  ],
  "chat-model": [
    { key: "provider", label: "Provider" },
    { key: "model", label: "Model" },
  ],
  "agent-tool": [
    { key: "toolName", label: "Tool Name" },
    { key: "toolType", label: "Tool Type" },
  ],
  "entry-point": [],
  "http-request": [{ key: "url", label: "URL" }],
  "email-send": [
    { key: "to", label: "Recipient" },
    { key: "subject", label: "Subject" },
  ],
  "slack-send": [{ key: "channel", label: "Channel" }],
};

/**
 * Validate all nodes in a workflow for configuration and connection issues.
 */
export function validateWorkflowNodes(
  nodes: Node[],
  edges: Edge[],
): NodeIssue[] {
  const issues: NodeIssue[] = [];

  for (const node of nodes) {
    const data = node.data as Record<string, unknown>;
    const componentId =
      (data.componentId as string) ||
      (data.nodeType as string)?.toLowerCase().replace(/_/g, "-") ||
      "";
    const label = (data.label as string) || componentId || "Unknown Node";
    const config = (data.config || {}) as Record<string, unknown>;

    // Check required config fields
    const requiredFields = REQUIRED_CONFIG[componentId];
    if (requiredFields) {
      for (const field of requiredFields) {
        const val = config[field.key];
        if (val === undefined || val === null || val === "") {
          issues.push({
            nodeId: node.id,
            nodeLabel: label,
            severity: "error",
            message: `Missing required field: ${field.label}`,
          });
        }
      }
    }

    // Check required connections
    const requiredConns = REQUIRED_CONNECTIONS[componentId];
    if (requiredConns) {
      for (const req of requiredConns) {
        const isConnected = edges.some((e) => {
          if (req.handleType === "target") {
            return e.target === node.id && (
              !req.handleId || req.handleId === "input"
                ? (!e.targetHandle || e.targetHandle === req.handleId)
                : e.targetHandle === req.handleId
            );
          }
          return e.source === node.id && (
            !req.handleId
              ? true
              : e.sourceHandle === req.handleId
          );
        });

        if (!isConnected) {
          // For AI Agent "input" handle, skip if it's the first node
          if (componentId === "ai-agent" && req.handleId === "input") {
            continue;
          }
          issues.push({
            nodeId: node.id,
            nodeLabel: label,
            severity: req.handleId === "chatModel" ? "error" : "warning",
            message: `Missing connection: ${req.label} is not connected`,
          });
        }
      }
    }

    // Check for orphaned nodes (no input or output connections at all)
    const hasAnyConnection = edges.some(
      (e) => e.source === node.id || e.target === node.id,
    );
    if (!hasAnyConnection && componentId !== "entry-point") {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        severity: "warning",
        message: "Node is not connected to the workflow",
      });
    }
  }

  return issues;
}
