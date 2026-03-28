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
    // No sub-nodes injected — AI Agent uses env vars (AI_API_KEY / AI_BASE_URL)
    // by default. Users can optionally connect a ChatModel sub-node for overrides.
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
