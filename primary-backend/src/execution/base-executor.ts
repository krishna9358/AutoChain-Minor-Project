import {
  BaseNode,
  NodeExecutionContext,
  NodeExecutionResult,
} from "../types/nodes";
import { getEncryptionManager } from "../encryption/manager";
import { safeEval } from "../utils/safeEval";

/**
 * Base Node Executor
 * Abstract base class that provides common execution logic for all node types
 */
export abstract class BaseNodeExecutor {
  protected encryptionManager = getEncryptionManager();

  /**
   * Execute the node with context
   */
  async execute(
    node: BaseNode,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const started_at = new Date().toISOString();
    let retryCount = 0;
    let lastError: Error | null = null;

    // Apply retry logic if configured
    const maxRetries = node.retry_policy?.retries || 0;

    while (retryCount <= maxRetries) {
      try {
        // Pre-execution validation
        await this.validate(node, context);

        // Execute with timeout
        const output = await this.executeWithTimeout(node, context);

        // Post-execution processing
        const processedOutput = await this.postExecute(node, context, output);

        return {
          node_id: node.node_id,
          status: "success",
          output: processedOutput,
          execution_time_ms: Date.now() - startTime,
          started_at,
          completed_at: new Date().toISOString(),
          retry_count: retryCount,
          metadata: {
            ...node.metadata,
            execution_mode: context.environment,
          },
        };
      } catch (error: any) {
        lastError = error;
        retryCount++;

        // Check if we should retry
        if (retryCount <= maxRetries && this.shouldRetry(error, node)) {
          // Apply backoff delay
          await this.applyBackoff(retryCount, node);
          continue;
        }

        // Handle error
        return this.handleError(
          node,
          context,
          error,
          startTime,
          started_at,
          retryCount,
        );
      }
    }

    // This should never be reached, but just in case
    return this.handleError(
      node,
      context,
      lastError || new Error("Unknown error"),
      startTime,
      started_at,
      retryCount,
    );
  }

  /**
   * Execute with timeout handling
   */
  private async executeWithTimeout(
    node: BaseNode,
    context: NodeExecutionContext,
    timeout?: number,
  ): Promise<any> {
    const timeoutMs = timeout || node.timeout_ms || 30000;

    return Promise.race([
      this.executeNode(node, context),
      this.createTimeoutPromise(timeoutMs),
    ]);
  }

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Node execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Abstract method to be implemented by specific executors
   */
  protected abstract executeNode(
    node: BaseNode,
    context: NodeExecutionContext,
  ): Promise<any>;

  /**
   * Validate node before execution
   */
  protected async validate(
    node: BaseNode,
    context: NodeExecutionContext,
  ): Promise<void> {
    if (!node.enabled) {
      throw new Error(`Node ${node.node_id} is disabled`);
    }

    // Validate context
    if (!context.workflow_id) {
      throw new Error("Missing workflow_id in context");
    }

    if (!context.execution_id) {
      throw new Error("Missing execution_id in context");
    }

    // Validate input data
    if (context.input_data && typeof context.input_data !== "object") {
      throw new Error("input_data must be an object");
    }

    // Subclasses can override this for additional validation
  }

  /**
   * Post-execution processing
   */
  protected async postExecute(
    node: BaseNode,
    context: NodeExecutionContext,
    output: any,
  ): Promise<any> {
    // Sanitize output for logging
    const sanitizedOutput = this.encryptionManager.sanitizeForLogging(output);

    // Store execution metadata
    return {
      ...output,
      _node_execution: {
        node_id: node.node_id,
        node_type: node.node_type,
        execution_id: context.execution_id,
        workflow_id: context.workflow_id,
      },
    };
  }

  /**
   * Handle execution errors
   */
  protected handleError(
    node: BaseNode,
    context: NodeExecutionContext,
    error: Error,
    startTime: number,
    started_at: string,
    retryCount: number,
  ): NodeExecutionResult {
    const errorDetails = this.parseError(error);

    // When retries are exhausted, signal that fallback routing should be attempted
    const maxRetries = node.retry_policy?.retries || 0;
    const retriesExhausted = retryCount > maxRetries && maxRetries > 0;

    return {
      node_id: node.node_id,
      status: "error",
      error: {
        message: error.message,
        code: errorDetails.code || "EXECUTION_ERROR",
        details: errorDetails.details,
      },
      execution_time_ms: Date.now() - startTime,
      started_at,
      completed_at: new Date().toISOString(),
      retry_count: retryCount,
      metadata: {
        ...node.metadata,
        error_type: errorDetails.type,
        fallback_recommended: retriesExhausted,
      },
    };
  }

  /**
   * Parse error into structured format
   */
  protected parseError(error: Error): {
    code?: string;
    type?: string;
    details?: any;
  } {
    const errorStr = error.message.toLowerCase();
    let code = "UNKNOWN_ERROR";
    let type = "general";

    if (errorStr.includes("timeout")) {
      code = "TIMEOUT";
      type = "timeout";
    } else if (
      errorStr.includes("network") ||
      errorStr.includes("connection")
    ) {
      code = "NETWORK_ERROR";
      type = "network";
    } else if (errorStr.includes("auth") || errorStr.includes("unauthorized")) {
      code = "AUTH_ERROR";
      type = "authentication";
    } else if (
      errorStr.includes("validation") ||
      errorStr.includes("invalid")
    ) {
      code = "VALIDATION_ERROR";
      type = "validation";
    } else if (
      errorStr.includes("permission") ||
      errorStr.includes("forbidden")
    ) {
      code = "PERMISSION_ERROR";
      type = "authorization";
    }

    return {
      code,
      type,
      details: {
        stack: error.stack,
        name: error.name,
      },
    };
  }

  /**
   * Determine if error is retryable
   */
  protected shouldRetry(error: Error, node: BaseNode): boolean {
    const errorStr = error.message.toLowerCase();

    // Don't retry on validation or permission errors
    if (
      errorStr.includes("validation") ||
      errorStr.includes("permission") ||
      errorStr.includes("forbidden") ||
      errorStr.includes("unauthorized")
    ) {
      return false;
    }

    // Retry on timeout, network, and temporary errors
    if (
      errorStr.includes("timeout") ||
      errorStr.includes("network") ||
      errorStr.includes("connection") ||
      errorStr.includes("econnreset") ||
      errorStr.includes("etimedout")
    ) {
      return true;
    }

    // Check retry policy
    if (node.retry_policy && node.retry_policy.retries > 0) {
      return true;
    }

    return false;
  }

  /**
   * Apply backoff delay before retry
   */
  protected async applyBackoff(
    retryCount: number,
    node: BaseNode,
  ): Promise<void> {
    if (!node.retry_policy) {
      return;
    }

    let delayMs = node.retry_policy.initial_delay_ms || 1000;

    switch (node.retry_policy.backoff) {
      case "exponential":
        delayMs = delayMs * Math.pow(2, retryCount - 1);
        break;
      case "linear":
        delayMs = delayMs * retryCount;
        break;
      case "fixed":
        // Use initial_delay_ms as fixed delay
        break;
    }

    // Cap the delay
    const maxDelay = node.retry_policy.max_delay_ms || 30000;
    delayMs = Math.min(delayMs, maxDelay);

    await this.sleep(delayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Resolve template variables in value
   */
  protected resolveTemplate(value: any, context: NodeExecutionContext): any {
    if (typeof value === "string") {
      return this.interpolateString(value, context);
    } else if (Array.isArray(value)) {
      return value.map((item) => this.resolveTemplate(item, context));
    } else if (typeof value === "object" && value !== null) {
      const resolved: any = {};
      for (const key in value) {
        resolved[key] = this.resolveTemplate(value[key], context);
      }
      return resolved;
    }

    return value;
  }

  /**
   * Interpolate string with variables
   */
  private interpolateString(
    str: string,
    context: NodeExecutionContext,
  ): string {
    // Replace {{expression}} patterns
    return str.replace(/\{\{(.*?)\}\}/g, (match, expression) => {
      try {
        return this.evaluateExpression(expression.trim(), context);
      } catch (error) {
        return match; // Return original if evaluation fails
      }
    });
  }

  /**
   * Evaluate expression against context
   */
  protected evaluateExpression(
    expression: string,
    context: NodeExecutionContext,
  ): string {
    // Handle simple property access like "input.amount"
    if (expression.startsWith("input.")) {
      const path = expression.substring(6);
      const value = this.getNestedValue(context.input_data, path);
      return value !== undefined ? String(value) : "";
    }

    // Handle previous result access like "prev.node_id.output"
    if (expression.startsWith("prev.")) {
      const parts = expression.substring(5).split(".");
      if (parts.length >= 2) {
        const nodeId = parts[0];
        const prevResult = context.previous_results?.[nodeId];
        if (prevResult && prevResult.output) {
          const path = parts.slice(1).join(".");
          const value = this.getNestedValue(prevResult.output, path);
          return value !== undefined ? String(value) : "";
        }
      }
      return "";
    }

    // Handle variable access like "variables.my_var"
    if (expression.startsWith("variables.")) {
      const path = expression.substring(10);
      const value = this.getNestedValue(context.variables, path);
      return value !== undefined ? String(value) : "";
    }

    // Handle workflow state like "state.my_key"
    if (expression.startsWith("state.")) {
      const path = expression.substring(6);
      const value = this.getNestedValue(context.workflow_state, path);
      return value !== undefined ? String(value) : "";
    }

    // Try evaluating as safe expression
    try {
      const result = safeEval(expression, {
        input: context.input_data,
        prev: context.previous_results,
        variables: context.variables,
        state: context.workflow_state,
      });
      return result !== undefined ? String(result) : "";
    } catch (error) {
      return "";
    }
  }

  /**
   * Get nested value from object by path
   */
  protected getNestedValue(obj: any, path: string): any {
    if (!obj) return undefined;

    const keys = path.split(".");
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Create execution log entry
   */
  protected createLogEntry(
    level: "debug" | "info" | "warn" | "error" | "fatal",
    message: string,
    context: NodeExecutionContext,
    node: BaseNode,
    metadata?: any,
  ): any {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: {
        workflow_id: context.workflow_id,
        execution_id: context.execution_id,
        node_id: node.node_id,
        node_type: node.node_type,
      },
      metadata: {
        ...metadata,
        input: this.encryptionManager.sanitizeForLogging(context.input_data),
      },
    };
  }

  /**
   * Merge multiple objects
   */
  protected mergeObjects(...objects: any[]): any {
    return objects.reduce((acc, obj) => {
      if (typeof obj === "object" && obj !== null) {
        Object.assign(acc, obj);
      }
      return acc;
    }, {});
  }

  /**
   * Clone object (deep copy)
   */
  protected cloneObject<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Generate correlation ID for tracing
   */
  protected generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate required fields in object
   */
  protected validateRequiredFields(
    obj: any,
    requiredFields: string[],
    context: string = "object",
  ): void {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (obj[field] === undefined || obj[field] === null) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields in ${context}: ${missingFields.join(", ")}`,
      );
    }
  }

  /**
   * Format duration in human-readable format
   */
  protected formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }

  /**
   * Check if value is empty
   */
  protected isEmpty(value: any): boolean {
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "object" && Object.keys(value).length === 0)
    );
  }
}
