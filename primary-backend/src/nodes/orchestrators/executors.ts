import { BaseNodeExecutor } from '../../execution/base-executor';
import {
  ConditionalNode,
  ParallelNode,
  LoopNode,
  SwitchNode,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/nodes';
import { NodeExecutorFactory } from '../../execution/factory';

/**
 * Conditional Orchestrator Executor
 * Evaluates conditions and routes execution to appropriate branch
 */
export class ConditionalExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: ConditionalNode,
    context: NodeExecutionContext
  ): Promise<any> {
    this.validateRequiredFields(node, ['condition', 'true_branch', 'false_branch']);

    // Resolve template variables in condition
    const resolvedCondition = this.resolveTemplate(node.condition, context);
    const resolvedVariables = node.variables ? this.resolveTemplate(node.variables, context) : {};

    // Evaluate condition
    const evaluationResult = await this.evaluateCondition(
      resolvedCondition,
      node.evaluation_mode,
      node.ai_config,
      context,
      resolvedVariables
    );

    // Determine which branch to take
    const selectedBranch = evaluationResult ? node.true_branch : node.false_branch;

    return {
      orchestrator_type: 'conditional',
      condition: node.condition,
      evaluated_condition: resolvedCondition,
      result: evaluationResult,
      evaluation_mode: node.evaluation_mode,
      selected_branch: selectedBranch,
      branches: {
        true_branch: node.true_branch,
        false_branch: node.false_branch,
      },
      variables_used: Object.keys(resolvedVariables),
      metadata: {
        execution_path: evaluationResult ? 'true' : 'false',
        evaluation_time_ms: evaluationResult.time_ms || 0,
      },
    };
  }

  /**
   * Evaluate condition based on mode
   */
  private async evaluateCondition(
    condition: string,
    mode: 'javascript' | 'python' | 'ai',
    aiConfig: any,
    context: NodeExecutionContext,
    variables: any
  ): Promise<{ result: boolean; time_ms?: number }> {
    const startTime = Date.now();

    try {
      switch (mode) {
        case 'javascript':
          return {
            result: this.evaluateJavaScriptCondition(condition, context, variables),
            time_ms: Date.now() - startTime,
          };

        case 'python':
          return {
            result: await this.evaluatePythonCondition(condition, context, variables),
            time_ms: Date.now() - startTime,
          };

        case 'ai':
          return {
            result: await this.evaluateAICondition(condition, aiConfig, context, variables),
            time_ms: Date.now() - startTime,
          };

        default:
          return {
            result: this.evaluateJavaScriptCondition(condition, context, variables),
            time_ms: Date.now() - startTime,
          };
      }
    } catch (error: any) {
      throw new Error(`Condition evaluation failed: ${error.message}`);
    }
  }

  /**
   * Evaluate JavaScript condition
   */
  private evaluateJavaScriptCondition(
    condition: string,
    context: NodeExecutionContext,
    variables: any
  ): boolean {
    try {
      // Create evaluation scope
      const scope = {
        input: context.input_data,
        prev: context.previous_results,
        variables: { ...context.variables, ...variables },
        state: context.workflow_state,
        env: process.env,
      };

      // Safe evaluation using Function constructor
      const func = new Function(...Object.keys(scope), `return ${condition}`);
      return Boolean(func(...Object.values(scope)));
    } catch (error) {
      throw new Error(`JavaScript evaluation error: ${error}`);
    }
  }

  /**
   * Evaluate Python condition (would use a Python bridge)
   */
  private async evaluatePythonCondition(
    condition: string,
    context: NodeExecutionContext,
    variables: any
  ): Promise<boolean> {
    // Placeholder for Python evaluation
    // In a real implementation, this would use a Python subprocess or API
    return Boolean(condition);
  }

  /**
   * Evaluate condition using AI
   */
  private async evaluateAICondition(
    condition: string,
    aiConfig: any,
    context: NodeExecutionContext,
    variables: any
  ): Promise<boolean> {
    // Resolve API key
    const apiKey = aiConfig?.api_key?.startsWith('env.')
      ? process.env[aiConfig.api_key.substring(4)]
      : aiConfig?.api_key;

    if (!apiKey) {
      throw new Error('AI API key not configured');
    }

    // Create evaluation prompt
    const prompt = `Evaluate the following condition as true or false based on the provided context.

Condition: ${condition}

Context:
- Input data: ${JSON.stringify(context.input_data, null, 2)}
- Variables: ${JSON.stringify({ ...context.variables, ...variables }, null, 2)}
- Previous results: ${JSON.stringify(context.previous_results, null, 2)}

Respond with only "true" or "false".`;

    // Make AI API call (simplified)
    // In a real implementation, this would use the OpenAI or other AI SDK
    const response = await this.callAIForEvaluation(prompt, aiConfig, apiKey);

    return response.toLowerCase().trim() === 'true';
  }

  /**
   * Call AI for condition evaluation
   */
  private async callAIForEvaluation(
    prompt: string,
    aiConfig: any,
    apiKey: string
  ): Promise<string> {
    // Placeholder implementation
    // In a real implementation, this would use the OpenAI SDK
    return 'true';
  }
}

/**
 * Parallel Orchestrator Executor
 * Executes multiple branches concurrently
 */
export class ParallelExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: ParallelNode,
    context: NodeExecutionContext
  ): Promise<any> {
    this.validateRequiredFields(node, ['branches']);

    if (node.branches.length === 0) {
      throw new Error('Parallel executor requires at least one branch');
    }

    const concurrencyLimit = node.max_concurrency || 5;
    const results: Map<string, NodeExecutionResult> = new Map();
    const errors: Array<{ branch: string; error: any }> = [];

    // Execute branches with concurrency control
    if (node.wait_for_all) {
      // Execute all branches and wait for completion
      const branchPromises = node.branches.map(async (branchId: string) => {
        try {
          const branchContext = this.createBranchContext(context, branchId, node.branches);
          const result = await this.executeBranch(branchId, branchContext);
          results.set(branchId, result);
        } catch (error: any) {
          errors.push({ branch: branchId, error });

          if (node.on_error === 'stop_all') {
            throw error;
          }
        }
      });

      // Execute with concurrency limit
      await this.executeWithConcurrency(branchPromises, concurrencyLimit);
    } else {
      // Fire and forget - execute branches asynchronously
      node.branches.forEach((branchId: string) => {
        this.executeBranch(branchId, context)
          .then(result => results.set(branchId, result))
          .catch(error => {
            errors.push({ branch: branchId, error });
          });
      });
    }

    return {
      orchestrator_type: 'parallel',
      branches: node.branches,
      results: this.serializeResults(results),
      errors: errors.map(e => ({
        branch: e.branch,
        error: e.error.message || String(e.error),
      })),
      wait_for_all: node.wait_for_all,
      on_error: node.on_error,
      max_concurrency: concurrencyLimit,
      metadata: {
        total_branches: node.branches.length,
        successful_branches: results.size,
        failed_branches: errors.length,
      },
    };
  }

  /**
   * Create execution context for a branch
   */
  private createBranchContext(
    context: NodeExecutionContext,
    branchId: string,
    allBranches: string[]
  ): NodeExecutionContext {
    return {
      ...context,
      variables: {
        ...context.variables,
        branch_id,
        branch_index: allBranches.indexOf(branchId),
        total_branches: allBranches.length,
      },
    };
  }

  /**
   * Execute a single branch
   */
  private async executeBranch(
    branchId: string,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    // In a real implementation, this would look up the node and execute it
    // For now, return a placeholder result
    return {
      node_id: branchId,
      status: 'success',
      output: { branch: branchId },
      execution_time_ms: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      retry_count: 0,
    };
  }

  /**
   * Execute promises with concurrency limit
   */
  private async executeWithConcurrency<T>(
    promises: (() => Promise<T>)[],
    concurrencyLimit: number
  ): Promise<void> {
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const p = promise().then(() => {
        executing.splice(executing.indexOf(p), 1);
      });

      executing.push(p);

      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  }

  /**
   * Serialize results map to object
   */
  private serializeResults(results: Map<string, NodeExecutionResult>): Record<string, any> {
    const serialized: Record<string, any> = {};
    for (const [key, value] of results.entries()) {
      serialized[key] = value;
    }
    return serialized;
  }
}

/**
 * Loop Orchestrator Executor
 * Iterates over data or repeats execution
 */
export class LoopExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: LoopNode,
+    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, ["loop_type", "body_node"]);

    const results: any[] = [];
    let iterations = 0;
    let shouldContinue = true;
    const maxIterations = node.max_iterations || 100;

    // Determine iteration data based on loop type
    const iterationData = this.getIterationData(node, context);

    // Execute loop
    switch (node.loop_type) {
      case 'for':
        await this.executeForLoop(node, context, iterationData, maxIterations, results);
        break;

      case 'while':
        await this.executeWhileLoop(node, context, maxIterations, results);
        break;

      case 'foreach':
        await this.executeForEachLoop(node, context, iterationData, maxIterations, results);
        break;

      case 'do_while':
        await this.executeDoWhileLoop(node, context, maxIterations, results);
        break;

      default:
        throw new Error(`Unknown loop type: ${node.loop_type}`);
    }

    return {
      orchestrator_type: 'loop',
      loop_type: node.loop_type,
      iterations_completed: results.length,
      results: node.collect_results ? results : undefined,
      max_iterations: maxIterations,
      loop_over: node.loop_over,
      condition: node.condition,
      break_condition: node.break_condition,
      collect_results: node.collect_results,
      metadata: {
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        execution_time_ms: 0,
      },
    };
  }

  /**
   * Get iteration data based on loop configuration
   */
  private getIterationData(
    node: LoopNode,
    context: NodeExecutionContext
  ): any[] {
    switch (node.loop_type) {
      case 'for':
        if (node.iterations) {
          return Array.from({ length: node.iterations }, (_, i) => i);
        }
        return [];

      case 'foreach':
        if (node.loop_over) {
          const value = this.getNestedValue(context.input_data, node.loop_over);
          return Array.isArray(value) ? value : [];
        }
        return [];

      default:
        return [];
    }
  }

  /**
   * Execute for loop
   */
  private async executeForLoop(
    node: LoopNode,
    context: NodeExecutionContext,
    iterationData: any[],
    maxIterations: number,
    results: any[]
  ): Promise<void> {
    for (let i = 0; i < Math.min(iterationData.length, maxIterations); i++) {
      // Check break condition
      if (node.break_condition && this.evaluateBreakCondition(node.break_condition, context, i)) {
        break;
      }

      const loopContext = this.createLoopContext(context, i, iterationData[i], 'for');
      const result = await this.executeLoopBody(node.body_node, loopContext);

      if (node.collect_results) {
        results.push(result);
      }
    }
  }

  /**
   * Execute while loop
   */
  private async executeWhileLoop(
    node: LoopNode,
    context: NodeExecutionContext,
    maxIterations: number,
    results: any[]
  ): Promise<void> {
    let iteration = 0;

    while (iteration < maxIterations) {
      // Evaluate condition
      const shouldContinue = this.evaluateLoopCondition(node.condition || 'true', context, iteration);

      if (!shouldContinue) {
        break;
      }

      // Check break condition
      if (node.break_condition && this.evaluateBreakCondition(node.break_condition, context, iteration)) {
        break;
      }

      const loopContext = this.createLoopContext(context, iteration, null, 'while');
      const result = await this.executeLoopBody(node.body_node, loopContext);

      if (node.collect_results) {
        results.push(result);
      }

      iteration++;
    }
  }

  /**
   * Execute foreach loop
   */
  private async executeForEachLoop(
    node: LoopNode,
    context: NodeExecutionContext,
    iterationData: any[],
    maxIterations: number,
    results: any[]
  ): Promise<void> {
    for (let i = 0; i < Math.min(iterationData.length, maxIterations); i++) {
      // Check break condition
      if (node.break_condition && this.evaluateBreakCondition(node.break_condition, context, i)) {
        break;
      }

      const loopContext = this.createLoopContext(context, i, iterationData[i], 'foreach');
      const result = await this.executeLoopBody(node.body_node, loopContext);

      if (node.collect_results) {
        results.push(result);
      }
    }
  }

  /**
   * Execute do-while loop
   */
  private async executeDoWhileLoop(
    node: LoopNode,
    context: NodeExecutionContext,
    maxIterations: number,
    results: any[]
  ): Promise<void> {
    let iteration = 0;

    do {
      // Check break condition
      if (node.break_condition && this.evaluateBreakCondition(node.break_condition, context, iteration)) {
        break;
      }

      const loopContext = this.createLoopContext(context, iteration, null, 'do_while');
      const result = await this.executeLoopBody(node.body_node, loopContext);

      if (node.collect_results) {
        results.push(result);
      }

      iteration++;

      // Check condition after first iteration
      if (iteration >= maxIterations) {
        break;
      }
    } while (this.evaluateLoopCondition(node.condition || 'true', context, iteration));
  }

  /**
   * Create loop execution context
   */
  private createLoopContext(
    context: NodeExecutionContext,
    iteration: number,
    item: any,
    loopType: string
  ): NodeExecutionContext {
    return {
      ...context,
      input_data: {
        ...context.input_data,
        _loop: {
          iteration,
          index: iteration,
          item,
          type: loopType,
        },
      },
      variables: {
        ...context.variables,
        loop_iteration: iteration,
        loop_index: iteration,
        loop_item: item,
        loop_type: loopType,
      },
    };
  }

  /**
   * Execute loop body node
   */
  private async executeLoopBody(
    bodyNodeId: string,
    context: NodeExecutionContext
  ): Promise<any> {
    // In a real implementation, this would look up and execute the node
    // For now, return a placeholder result
    return {
      node_id: bodyNodeId,
      status: 'success',
      output: { loop_iteration: context.variables?.loop_iteration },
      execution_time_ms: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      retry_count: 0,
    };
  }

  /**
   * Evaluate loop condition
   */
  private evaluateLoopCondition(
    condition: string,
    context: NodeExecutionContext,
    iteration: number
  ): boolean {
    try {
      const scope = {
        input: context.input_data,
        prev: context.previous_results,
        variables: context.variables,
        state: context.workflow_state,
        env: process.env,
        iteration,
      };

      const func = new Function(...Object.keys(scope), `return ${condition}`);
      return Boolean(func(...Object.values(scope)));
    } catch (error) {
      return false;
    }
  }

  /**
   * Evaluate break condition
   */
  private evaluateBreakCondition(
    condition: string,
    context: NodeExecutionContext,
    iteration: number
  ): boolean {
    try {
      const scope = {
        input: context.input_data,
        prev: context.previous_results,
        variables: context.variables,
        state: context.workflow_state,
        env: process.env,
        iteration,
      };

      const func = new Function(...Object.keys(scope), `return ${condition}`);
      return Boolean(func(...Object.values(scope)));
    } catch (error) {
      return false;
    }
  }
}

/**
 * Switch Orchestrator Executor
 * Routes execution based on value matching
 */
export class SwitchExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: SwitchNode,
+    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, ["value_expression", "cases", "default_branch"]);

    // Resolve value expression
    const resolvedValue = this.resolveTemplate(node.value_expression, context);

    // Find matching case
    let selectedBranch = node.default_branch;
    let matchedCase: any = null;

    for (const caseConfig of node.cases) {
      const resolvedCondition = this.resolveTemplate(caseConfig.condition, context);

      if (this.evaluateCaseCondition(resolvedValue, resolvedCondition)) {
        selectedBranch = caseConfig.branch;
        matchedCase = caseConfig;
        break;
      }
    }

    return {
      orchestrator_type: 'switch',
      value_expression: node.value_expression,
      evaluated_value: resolvedValue,
      selected_branch: selectedBranch,
      matched_case: matchedCase,
      cases: node.cases,
      default_branch: node.default_branch,
      metadata: {
        match_found: matchedCase !== null,
        cases_evaluated: node.cases.length,
        execution_path: matchedCase?.condition || 'default',
      },
    };
  }

  /**
   * Evaluate case condition
   */
  private evaluateCaseCondition(value: any, condition: string): boolean {
    // Simple equality check
    if (condition === value) {
      return true;
    }

    // Try JavaScript evaluation
    try {
      const func = new Function('value', `return ${condition}`);
      return Boolean(func(value));
    } catch (error) {
      return false;
    }
  }
}

/**
 * Orchestrator Node Executors Registry
 * Provides easy access to all orchestrator executors
 */
export const OrchestratorExecutors = {
  Conditional: ConditionalExecutor,
  Parallel: ParallelExecutor,
  Loop: LoopExecutor,
  Switch: SwitchExecutor,
};

/**
 * Export types for use in other modules
 */
export type {
  ConditionalNode,
  ParallelNode,
  LoopNode,
  SwitchNode,
};
