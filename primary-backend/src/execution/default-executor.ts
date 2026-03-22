import { BaseNodeExecutor } from "./base-executor";
import { BaseNode, NodeExecutionContext } from "../types/nodes";

/**
 * Default Node Executor
 * Pass-through executor for node types that don't have a specific implementation.
 * Returns the input data unchanged so downstream nodes still receive data.
 */
export class DefaultNodeExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: BaseNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    return {
      passthrough: true,
      node_type: node.node_type,
      input_data: context.input_data,
    };
  }
}

/**
 * Delay Executor
 * Waits for the configured duration before passing data through.
 */
export class DelayExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: BaseNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    const config = (node as any).config || (node as any).metadata?.config || {};
    const durationMs =
      config.durationMs ??
      config.duration_ms ??
      config.delay ??
      config.delayMs ??
      1000;

    const capped = Math.min(Math.max(0, Number(durationMs) || 0), 300_000); // cap at 5 min

    await new Promise((resolve) => setTimeout(resolve, capped));

    return {
      delayed: true,
      duration_ms: capped,
      payload: context.input_data,
    };
  }
}
