import type { Node, Edge } from "@xyflow/react";

/**
 * Component migration registry.
 * When a component is deprecated, renamed, or its config schema changes,
 * add an entry here so existing workflows & templates auto-migrate.
 */

interface MigrationRule {
  /** Old component ID */
  from: string;
  /** New component ID (or same if only config changed) */
  to: string;
  /** New React Flow node type */
  nodeType?: string;
  /** Description shown in toast */
  description: string;
  /** Transform old config to new config */
  migrateConfig?: (old: Record<string, unknown>) => Record<string, unknown>;
  /** Extra nodes to inject (e.g., sub-nodes for AI Agent) */
  injectNodes?: (
    node: Node,
    ts: number,
  ) => { nodes: Node[]; edges: Edge[] };
}

const MIGRATION_RULES: MigrationRule[] = [
  {
    from: "ai-agent",
    to: "ai-agent",
    nodeType: "aiAgentNode",
    description: "AI Agent updated to v2 with sub-node architecture",
    migrateConfig: (old) => {
      // Migrate old provider/model config to new agentType-based config
      const newConfig: Record<string, unknown> = {};
      newConfig.agentType = old.agentType || "executor";
      newConfig.systemPrompt = old.systemPrompt || "";
      newConfig.userPromptTemplate = old.userPromptTemplate || "{{payload.text}}";
      newConfig.responseFormat = old.responseFormat || old.outputFormat || "text";
      newConfig.maxIterations = old.maxIterations || 10;
      newConfig.timeout = old.timeout || 30000;
      newConfig.stopOnError = old.stopOnError || false;
      return newConfig;
    },
    injectNodes: (node, ts) => {
      // If the AI Agent has old-style provider/model config, create a ChatModel sub-node
      const data = node.data as Record<string, unknown>;
      const config = (data.config || {}) as Record<string, unknown>;

      if (!config.provider && !config.model && !config.apiKey) {
        // Already migrated or no old config — just inject a default chat model
        const chatModelId = `chat-model-auto-${ts}-${node.id}`;
        return {
          nodes: [
            {
              id: chatModelId,
              type: "chatModelNode",
              position: {
                x: (node.position?.x || 0) - 40,
                y: (node.position?.y || 0) + 140,
              },
              data: {
                nodeType: "chat-model",
                componentId: "chat-model",
                label: "Chat Model",
                category: "ai",
                config: { provider: "openrouter", model: "gpt-4o", temperature: 0.7 },
              },
            },
          ],
          edges: [
            {
              id: `sub-edge-${ts}-${node.id}`,
              source: chatModelId,
              sourceHandle: "model-out",
              target: node.id,
              targetHandle: "chatModel",
              style: { stroke: "#555", strokeWidth: 1.5, strokeDasharray: "6 4" },
            },
          ],
        };
      }

      // Extract provider/model from old config and create a ChatModel sub-node
      const chatModelId = `chat-model-migrated-${ts}-${node.id}`;
      return {
        nodes: [
          {
            id: chatModelId,
            type: "chatModelNode",
            position: {
              x: (node.position?.x || 0) - 40,
              y: (node.position?.y || 0) + 140,
            },
            data: {
              nodeType: "chat-model",
              componentId: "chat-model",
              label: "Chat Model",
              category: "ai",
              config: {
                provider: config.provider || "openrouter",
                model: config.customModel || config.model || "gpt-4o",
                apiKey: config.apiKey || "",
                baseUrl: config.baseURL || config.customUrl || "",
                temperature: config.temperature || 0.7,
                maxTokens: config.maxTokens || 4096,
              },
            },
          },
        ],
        edges: [
          {
            id: `sub-edge-${ts}-${node.id}`,
            source: chatModelId,
            sourceHandle: "model-out",
            target: node.id,
            targetHandle: "chatModel",
            style: { stroke: "#555", strokeWidth: 1.5, strokeDasharray: "6 4" },
          },
        ],
      };
    },
  },
];

export interface MigrationResult {
  nodes: Node[];
  edges: Edge[];
  migrations: string[];
}

/**
 * Check if a node needs migration and return the rule if so.
 */
function findMigrationRule(componentId: string, node: Node): MigrationRule | null {
  for (const rule of MIGRATION_RULES) {
    if (rule.from !== componentId) continue;

    // For ai-agent: only migrate if using old node type (workflowNode) or old config
    if (rule.from === "ai-agent") {
      const data = node.data as Record<string, unknown>;
      const config = (data.config || {}) as Record<string, unknown>;
      const isOldType = node.type === "workflowNode";
      const hasOldConfig = "provider" in config || "model" in config;
      if (isOldType || hasOldConfig) return rule;
    } else {
      return rule;
    }
  }
  return null;
}

/**
 * Migrate a workflow's nodes and edges, applying all relevant migration rules.
 * Returns the migrated nodes/edges plus a list of human-readable migration descriptions.
 */
export function migrateWorkflow(
  nodes: Node[],
  edges: Edge[],
): MigrationResult {
  const ts = Date.now();
  const migratedNodes: Node[] = [];
  const extraNodes: Node[] = [];
  const extraEdges: Edge[] = [];
  const migrations: string[] = [];

  for (const node of nodes) {
    const data = node.data as Record<string, unknown>;
    const componentId =
      (data.componentId as string) ||
      (data.nodeType as string)?.toLowerCase().replace(/_/g, "-") ||
      "";

    const rule = findMigrationRule(componentId, node);

    if (!rule) {
      migratedNodes.push(node);
      continue;
    }

    // Apply config migration
    const oldConfig = (data.config || {}) as Record<string, unknown>;
    const newConfig = rule.migrateConfig
      ? rule.migrateConfig(oldConfig)
      : oldConfig;

    const migratedNode: Node = {
      ...node,
      type: rule.nodeType || node.type,
      data: {
        ...data,
        componentId: rule.to,
        nodeType: rule.to,
        config: newConfig,
      },
    };
    migratedNodes.push(migratedNode);

    // Inject sub-nodes if needed
    if (rule.injectNodes) {
      const injected = rule.injectNodes(migratedNode, ts);
      extraNodes.push(...injected.nodes);
      extraEdges.push(...(injected.edges as Edge[]));
    }

    migrations.push(
      `"${(data.label as string) || componentId}": ${rule.description}`,
    );
  }

  return {
    nodes: [...migratedNodes, ...extraNodes],
    edges: [...edges, ...extraEdges],
    migrations,
  };
}
