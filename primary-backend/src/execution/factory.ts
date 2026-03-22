import { BaseNodeExecutor } from "./base-executor";
import { DefaultNodeExecutor, DelayExecutor } from "./default-executor";
import {
  AnyNode,
  NodeExecutionContext,
  NodeExecutionResult,
} from "../types/nodes";
import { resolveComponentId } from "../router/componentCatalog";
import {
  WebhookTriggerExecutor,
  EventTriggerExecutor,
  ScheduleTriggerExecutor,
} from "../nodes/triggers/executors";
import { AgentNodeExecutor } from "../nodes/agents/executor";
import {
  HttpToolExecutor,
  DatabaseToolExecutor,
  EmailToolExecutor,
  SlackToolExecutor,
  BrowserToolExecutor,
} from "../nodes/tools/executors";
import {
  ConditionalExecutor,
  ParallelExecutor,
  LoopExecutor,
  SwitchExecutor,
} from "../nodes/orchestrators/executors";
import { ValidationNodeExecutor } from "../nodes/validation/executor";
import { ErrorHandlingNodeExecutor } from "../nodes/error-handling/executor";
import { WorkflowMonitorNodeExecutor } from "../nodes/monitoring/workflow-monitor";
import { AuditLogNodeExecutor } from "../nodes/monitoring/audit-log";
import { MemoryNodeExecutor } from "../nodes/memory/executor";
import { HumanApprovalNodeExecutor } from "../nodes/approval/executor";
import { MeetingIntelligenceNodeExecutor } from "../nodes/meeting-intelligence/executor";

/**
 * Node Executor Factory
 * Instantiates appropriate executors based on node type
 */
export class NodeExecutorFactory {
  private static executorMap: Map<string, new () => any> =
    new Map();

  /**
   * Initialize the executor registry with all node types
   */
  private static initializeRegistry(): void {
    if (this.executorMap.size > 0) {
      return; // Already initialized
    }

    // Trigger nodes
    this.executorMap.set("trigger.webhook", WebhookTriggerExecutor);
    this.executorMap.set("trigger.event", EventTriggerExecutor);
    this.executorMap.set("trigger.schedule", ScheduleTriggerExecutor);

    // Agent nodes
    this.executorMap.set("agent", AgentNodeExecutor);

    // Tool nodes
    this.executorMap.set("tool.http", HttpToolExecutor);
    this.executorMap.set("tool.database", DatabaseToolExecutor);
    this.executorMap.set("tool.email", EmailToolExecutor);
    this.executorMap.set("tool.slack", SlackToolExecutor);
    this.executorMap.set("tool.browser", BrowserToolExecutor);

    // Orchestrator nodes
    this.executorMap.set("orchestrator.conditional", ConditionalExecutor);
    this.executorMap.set("orchestrator.parallel", ParallelExecutor);
    this.executorMap.set("orchestrator.loop", LoopExecutor);
    this.executorMap.set("orchestrator.switch", SwitchExecutor);

    // Validation nodes
    this.executorMap.set("validation", ValidationNodeExecutor);

    // Error handling nodes
    this.executorMap.set("error_handling", ErrorHandlingNodeExecutor);

    // Monitoring nodes
    this.executorMap.set("monitor.workflow", WorkflowMonitorNodeExecutor);
    this.executorMap.set("audit.log", AuditLogNodeExecutor);

    // Memory nodes
    this.executorMap.set("memory", MemoryNodeExecutor);

    // Human approval nodes
    this.executorMap.set("human.approval", HumanApprovalNodeExecutor);

    // Meeting intelligence nodes
    this.executorMap.set(
      "meeting.intelligence",
      MeetingIntelligenceNodeExecutor,
    );

    // Catalog-format aliases (kebab-case componentCatalog IDs → same executors)
    this.executorMap.set("entry-point", WebhookTriggerExecutor);
    this.executorMap.set("http-request", HttpToolExecutor);
    this.executorMap.set("slack-send", SlackToolExecutor);
    this.executorMap.set("email-send", EmailToolExecutor);
    this.executorMap.set("db-query", DatabaseToolExecutor);
    this.executorMap.set("if-condition", ConditionalExecutor);
    this.executorMap.set("switch-case", SwitchExecutor);
    this.executorMap.set("loop", LoopExecutor);
    this.executorMap.set("ai-agent", AgentNodeExecutor);
    this.executorMap.set("text-transform", AgentNodeExecutor);
    this.executorMap.set("delay", DelayExecutor);
    this.executorMap.set("error-handler", ErrorHandlingNodeExecutor);
    this.executorMap.set("approval", HumanApprovalNodeExecutor);
    this.executorMap.set("artifact-writer", DefaultNodeExecutor);
    this.executorMap.set("webhook-response", DefaultNodeExecutor);
    this.executorMap.set("github", DefaultNodeExecutor);
    this.executorMap.set("google-calendar", DefaultNodeExecutor);
    this.executorMap.set("google-meet", DefaultNodeExecutor);
    this.executorMap.set("google-docs", DefaultNodeExecutor);
    this.executorMap.set("google-sheets", DefaultNodeExecutor);
  }

  /**
   * Get executor class for a given node type
   */
  private static getExecutorClass(
    nodeType: string,
  ): new () => any {
    this.initializeRegistry();

    let ExecutorClass = this.executorMap.get(nodeType);
    if (!ExecutorClass) {
      const canonical = resolveComponentId(nodeType);
      if (canonical) ExecutorClass = this.executorMap.get(canonical);
    }
    if (!ExecutorClass) {
      return DefaultNodeExecutor;
    }

    return ExecutorClass;
  }

  /**
   * Create executor instance for a given node
   */
  static createExecutor(node: AnyNode): any {
    const ExecutorClass = this.getExecutorClass(node.node_type as string);
    return new ExecutorClass();
  }

  /**
   * Execute a node using the appropriate executor
   */
  static async executeNode(
    node: AnyNode,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const executor = this.createExecutor(node);
    return await executor.execute(node as any, context);
  }

  /**
   * Check if executor exists for a given node type
   */
  static hasExecutor(nodeType: string): boolean {
    this.initializeRegistry();
    return this.executorMap.has(nodeType);
  }

  /**
   * Get all registered node types
   */
  static getRegisteredNodeTypes(): string[] {
    this.initializeRegistry();
    return Array.from(this.executorMap.keys());
  }

  /**
   * Register a custom executor for a node type
   */
  static registerExecutor(
    nodeType: string,
    executorClass: new () => BaseNodeExecutor,
  ): void {
    this.initializeRegistry();
    this.executorMap.set(nodeType, executorClass);
  }

  /**
   * Unregister an executor for a node type
   */
  static unregisterExecutor(nodeType: string): boolean {
    this.initializeRegistry();
    return this.executorMap.delete(nodeType);
  }

  /**
   * Get executor metadata for a node type
   */
  static getExecutorMetadata(nodeType: string): {
    nodeType: string;
    registered: boolean;
    category: string;
  } | null {
    this.initializeRegistry();

    if (!this.executorMap.has(nodeType)) {
      return null;
    }

    // Determine category based on node type prefix
    let category = "unknown";
    if (nodeType.startsWith("trigger.")) {
      category = "trigger";
    } else if (nodeType === "agent") {
      category = "agent";
    } else if (nodeType.startsWith("tool.")) {
      category = "tool";
    } else if (nodeType.startsWith("orchestrator.")) {
      category = "orchestrator";
    } else if (nodeType === "validation") {
      category = "validation";
    } else if (nodeType === "error_handling") {
      category = "error_handling";
    } else if (nodeType.startsWith("monitor.") || nodeType === "audit.log") {
      category = "monitoring";
    } else if (nodeType === "memory") {
      category = "memory";
    } else if (nodeType === "human.approval") {
      category = "approval";
    } else if (nodeType === "meeting.intelligence") {
      category = "meeting_intelligence";
    }

    return {
      nodeType,
      registered: true,
      category,
    };
  }

  /**
   * Get all executors by category
   */
  static getExecutorsByCategory(category: string): string[] {
    const allTypes = this.getRegisteredNodeTypes();

    return allTypes.filter((nodeType) => {
      const metadata = this.getExecutorMetadata(nodeType);
      return metadata?.category === category;
    });
  }

  /**
   * Validate executor registration
   */
  static validateRegistration(): {
    valid: boolean;
    registered: number;
    missing: string[];
  } {
    const expectedTypes = [
      "trigger.webhook",
      "trigger.event",
      "trigger.schedule",
      "agent",
      "tool.http",
      "tool.database",
      "tool.email",
      "tool.slack",
      "tool.browser",
      "orchestrator.conditional",
      "orchestrator.parallel",
      "orchestrator.loop",
      "orchestrator.switch",
      "validation",
      "error_handling",
      "monitor.workflow",
      "audit.log",
      "memory",
      "human.approval",
      "meeting.intelligence",
    ];

    const registered = this.getRegisteredNodeTypes();
    const missing = expectedTypes.filter((type) => !registered.includes(type));

    return {
      valid: missing.length === 0,
      registered: registered.length,
      missing,
    };
  }

  /**
   * Get executor instance (singleton per node type)
   */
  private static executorInstances: Map<string, any> = new Map();

  static getExecutorInstance(nodeType: string): any {
    if (this.executorInstances.has(nodeType)) {
      return this.executorInstances.get(nodeType)!;
    }

    const ExecutorClass = this.getExecutorClass(nodeType);
    const instance = new ExecutorClass();
    this.executorInstances.set(nodeType, instance);
    return instance;
  }

  /**
   * Clear all cached executor instances
   */
  static clearCache(): void {
    this.executorInstances.clear();
  }

  /**
   * Batch execute multiple nodes
   */
  static async batchExecute(
    nodes: Array<{ node: AnyNode; context: NodeExecutionContext }>,
  ): Promise<Map<string, NodeExecutionResult>> {
    const results = new Map<string, NodeExecutionResult>();
    const executionPromises = nodes.map(async ({ node, context }) => {
      try {
        const result = await this.executeNode(node, context);
        results.set(node.node_id as string, result);
      } catch (error) {
        results.set(node.node_id as string, {
          node_id: node.node_id as string,
          status: "error",
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          execution_time_ms: 0,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          retry_count: 0,
        });
      }
    });

    await Promise.all(executionPromises);
    return results;
  }

  /**
   * Get executor statistics
   */
  static getStatistics(): {
    totalRegistered: number;
    byCategory: Record<string, number>;
    cachedInstances: number;
  } {
    const allTypes = this.getRegisteredNodeTypes();
    const byCategory: Record<string, number> = {};

    allTypes.forEach((type) => {
      const metadata = this.getExecutorMetadata(type);
      if (metadata) {
        byCategory[metadata.category] =
          (byCategory[metadata.category] || 0) + 1;
      }
    });

    return {
      totalRegistered: allTypes.length,
      byCategory,
      cachedInstances: this.executorInstances.size,
    };
  }
}

/**
 * Create an alias for backward compatibility
 */
export const ExecutorFactory = NodeExecutorFactory;

/**
 * Export types for use in other modules
 */
export type {
  BaseNodeExecutor,
  NodeExecutionContext,
  NodeExecutionResult,
  AnyNode,
};
