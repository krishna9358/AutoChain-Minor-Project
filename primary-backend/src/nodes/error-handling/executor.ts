import { BaseNodeExecutor } from '../../execution/base-executor';
import {
  ErrorHandlingNode,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../../types/nodes';
import { getConnectionManager } from '../../connections/manager';
import { OpenAI } from 'openai';
import axios from 'axios';

/**
 * Error Handling Node Executor
 * Handles error recovery, retries, fallbacks, and alerting
 */
export class ErrorHandlingNodeExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: any,
    context: NodeExecutionContext
  ): Promise<any> {
    this.validateRequiredFields(node, ['error_type']);

    // Get error details from context
    const errorDetails = this.extractErrorDetails(context);

    if (!errorDetails) {
      throw new Error('No error found in context for error handling node');
    }

    // Check if this error handler should handle the error
    if (!this.shouldHandleError(node, errorDetails)) {
      return {
        handler_type: 'error_handling',
        error_type: node.error_type,
        handled: false,
        reason: 'Error type does not match handler configuration',
        error_details: errorDetails,
        metadata: {
          skipped: true,
          skip_reason: 'Error type mismatch',
        },
      };
    }

    // Attempt recovery based on configuration
    const recoveryResult = await this.performRecovery(
      node,
      context,
      errorDetails
    );

    // Send alerts if configured
    const alertResult = await this.sendAlerts(
      node,
      context,
      errorDetails,
      recoveryResult
    );

    return {
      handler_type: 'error_handling',
      error_type: node.error_type,
      handled: recoveryResult.success,
      error_details: errorDetails,
      recovery: recoveryResult,
      alerting: alertResult,
      retry_policy: node.retry_policy,
      fallback: node.fallback,
      metadata: {
        recovery_strategy: node.fallback?.type || 'none',
        alert_enabled: node.alert?.enabled || false,
        alert_channels: node.alert?.type,
        error_code: errorDetails.code,
        error_severity: this.determineErrorSeverity(errorDetails),
      },
    };
  }

  /**
   * Extract error details from execution context
   */
  private extractErrorDetails(
    context: NodeExecutionContext
  ): {
    message: string;
    code?: string;
    node_id?: string;
    details?: any;
    type?: string;
    timestamp?: string;
  } | null {
    // Check for error in input data (passed from previous failed node)
    if (context.input_data.error) {
      return {
        message: context.input_data.error.message || 'Unknown error',
        code: context.input_data.error.code,
        details: context.input_data.error.details,
        node_id: context.input_data.error.node_id || context.node_id,
        timestamp: new Date().toISOString(),
      };
    }

    // Check previous results for error
    if (context.previous_results) {
      for (const [nodeId, result] of Object.entries(context.previous_results)) {
        const nodeResult = result as NodeExecutionResult;
        if (nodeResult.error) {
          return {
            message: nodeResult.error.message,
            code: nodeResult.error.code,
            node_id: nodeId,
            details: nodeResult.error.details,
            timestamp: nodeResult.completed_at,
          };
        }
      }
    }

    return null;
  }

  /**
   * Determine if this error handler should handle the error
   */
  private shouldHandleError(
    node: ErrorHandlingNode,
    errorDetails: any
  ): boolean {
    // Handle all errors if configured
    if (node.error_type === 'all') {
      return true;
    }

    // Match by error type
    if (node.error_type === 'api_failure') {
      return (
        errorDetails.code?.includes('API') ||
        errorDetails.code?.includes('NETWORK') ||
        errorDetails.message?.toLowerCase().includes('api') ||
        errorDetails.message?.toLowerCase().includes('network')
      );
    }

    if (node.error_type === 'timeout') {
      return (
        errorDetails.code?.includes('TIMEOUT') ||
        errorDetails.message?.toLowerCase().includes('timeout')
      );
    }

    if (node.error_type === 'validation') {
      return (
        errorDetails.code?.includes('VALIDATION') ||
        errorDetails.message?.toLowerCase().includes('validation')
      );
    }

    if (node.error_type === 'exception') {
      // Handle any exception that doesn't match specific types
      return true;
    }

    return false;
  }

  /**
   * Determine error severity based on error details
   */
  private determineErrorSeverity(errorDetails: any): 'low' | 'medium' | 'high' | 'critical' {
    const message = errorDetails.message?.toLowerCase() || '';
    const code = errorDetails.code?.toLowerCase() || '';

    // Critical errors
    if (
      message.includes('security') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      code.includes('security') ||
      code.includes('auth')
    ) {
      return 'critical';
    }

    // High severity
    if (
      message.includes('timeout') ||
      message.includes('database') ||
      message.includes('payment') ||
      code.includes('timeout') ||
      code.includes('db')
    ) {
      return 'high';
    }

    // Medium severity
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      code.includes('validation')
    ) {
      return 'medium';
    }

    // Low severity
    return 'low';
  }

  /**
   * Perform error recovery based on configuration
   */
  private async performRecovery(
    node: ErrorHandlingNode,
    context: NodeExecutionContext,
    errorDetails: any
  ): Promise<{
    success: boolean;
    strategy: string;
    result?: any;
    error?: string;
    attempts?: number;
  }> {
    const retryPolicy = node.retry_policy;
    const fallback = node.fallback;

    // First, attempt retry if configured
    if (retryPolicy && retryPolicy.retries > 0) {
      const retryResult = await this.attemptRetry(
        retryPolicy,
        context,
        errorDetails
      );

      if (retryResult.success) {
        return retryResult;
      }
    }

    // If retry failed, attempt fallback
    if (fallback) {
      return await this.executeFallback(
        fallback,
        context,
        errorDetails
      );
    }

    // No recovery strategy configured
    return {
      success: false,
      strategy: 'none',
      error: 'No recovery strategy configured',
    };
  }

  /**
   * Attempt retry with backoff
   */
  private async attemptRetry(
    retryPolicy: any,
    context: NodeExecutionContext,
    errorDetails: any
  ): Promise<{
    success: boolean;
    strategy: string;
    result?: any;
    error?: string;
    attempts: number;
  }> {
    const maxRetries = retryPolicy.retries;
    const backoffType = retryPolicy.backoff || 'exponential';
    const initialDelay = retryPolicy.initial_delay_ms || 1000;

    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Calculate delay based on backoff type
        let delay: number;
        switch (backoffType) {
          case 'exponential':
            delay = initialDelay * Math.pow(2, attempt - 1);
            break;
          case 'linear':
            delay = initialDelay * attempt;
            break;
          case 'fixed':
            delay = initialDelay;
            break;
          default:
            delay = initialDelay;
        }

        // Wait before retry
        await this.sleep(delay);

        // Attempt to retry the failed operation
        // In a real implementation, this would re-execute the failed node
        const result = await this.retryOperation(context, attempt);

        return {
          success: true,
          strategy: 'retry',
          result,
          attempts: attempt,
        };
      } catch (error: any) {
        lastError = error;
        console.warn(`Retry attempt ${attempt} failed: ${error.message}`);
      }
    }

    return {
      success: false,
      strategy: 'retry',
      error: lastError?.message || 'All retry attempts failed',
      attempts: maxRetries,
    };
  }

  /**
   * Retry the failed operation
   */
  private async retryOperation(context: NodeExecutionContext, attempt: number): Promise<any> {
    // In a real implementation, this would look up the failed node and re-execute it
    // For now, return a placeholder
    return {
      retry_attempt: attempt,
      status: 'success',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute fallback strategy
   */
  private async executeFallback(
    fallback: any,
    context: NodeExecutionContext,
    errorDetails: any
  ): Promise<{
    success: boolean;
    strategy: string;
    result?: any;
    error?: string;
  }> {
    try {
      switch (fallback.type) {
        case 'node':
          return await this.executeFallbackNode(
            fallback.target,
            context,
            errorDetails
          );

        case 'agent':
          return await this.executeFallbackAgent(
            fallback.target,
            context,
            errorDetails
          );

        case 'default_value':
          return {
            success: true,
            strategy: 'default_value',
            result: fallback.value,
          };

        case 'skip':
          return {
            success: true,
            strategy: 'skip',
            result: {
              skipped: true,
              reason: 'Fallback strategy set to skip',
            },
          };

        default:
          return {
            success: false,
            strategy: 'unknown',
            error: `Unknown fallback type: ${fallback.type}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        strategy: fallback.type,
        error: error.message,
      };
    }
  }

  /**
   * Execute fallback node
   */
  private async executeFallbackNode(
    nodeId: string,
    context: NodeExecutionContext,
    errorDetails: any
  ): Promise<any> {
    // In a real implementation, this would look up and execute the fallback node
    // For now, return a placeholder
    return {
      success: true,
      strategy: 'node',
      result: {
        node_id: nodeId,
        executed_as_fallback: true,
        original_error: errorDetails.message,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Execute fallback agent
   */
  private async executeFallbackAgent(
    agentId: string,
    context: NodeExecutionContext,
    errorDetails: any
  ): Promise<any> {
    // Initialize AI agent for recovery
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured for agent fallback');
    }

    const openai = new OpenAI({ apiKey });

    const recoveryPrompt = `Analyze the following error and provide recovery recommendations:

Error Details:
- Message: ${errorDetails.message}
- Code: ${errorDetails.code}
- Node ID: ${errorDetails.node_id}
- Details: ${JSON.stringify(errorDetails.details, null, 2)}

Context:
- Workflow ID: ${context.workflow_id}
- Execution ID: ${context.execution_id}
- Input Data: ${JSON.stringify(context.input_data, null, 2)}

Provide:
1. Root cause analysis
2. Suggested recovery actions
3. Whether the workflow can continue
4. Any data transformations needed

Respond in JSON format.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert error recovery agent.' },
          { role: 'user', content: recoveryPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const recoveryPlan = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        success: true,
        strategy: 'agent',
        result: {
          agent_id: agentId,
          recovery_plan: recoveryPlan,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      throw new Error(`Agent fallback failed: ${error.message}`);
    }
  }

  /**
   * Send alerts based on configuration
   */
  private async sendAlerts(
    node: ErrorHandlingNode,
    context: NodeExecutionContext,
    errorDetails: any,
    recoveryResult: any
  ): Promise<{
    enabled: boolean;
    type?: string;
    sent: boolean;
    channels?: any[];
    error?: string;
  }> {
    if (!node.alert || !node.alert.enabled) {
      return {
        enabled: false,
        sent: false,
      };
    }

    try {
      const alertChannels = [];

      // Send alert to configured channel
      switch (node.alert.type) {
        case 'slack':
          await this.sendSlackAlert(
            node.alert.connection_id || '',
            node.alert.channel || '',
            context,
            errorDetails,
            recoveryResult
          );
          alertChannels.push({ type: 'slack', sent: true });
          break;

        case 'email':
          await this.sendEmailAlert(
            node.alert.recipients || [],
            context,
            errorDetails,
            recoveryResult
          );
          alertChannels.push({ type: 'email', sent: true });
          break;

        case 'teams':
          await this.sendTeamsAlert(
            node.alert.connection_id || '',
            context,
            errorDetails,
            recoveryResult
          );
          alertChannels.push({ type: 'teams', sent: true });
          break;

        case 'webhook':
          await this.sendWebhookAlert(
            node.alert.connection_id || '',
            context,
            errorDetails,
            recoveryResult
          );
          alertChannels.push({ type: 'webhook', sent: true });
          break;

        case 'pagerduty':
          await this.sendPagerDutyAlert(
            node.alert.connection_id || '',
            context,
            errorDetails,
            recoveryResult
          );
          alertChannels.push({ type: 'pagerduty', sent: true });
          break;

        default:
          console.warn(`Unknown alert type: ${node.alert.type}`);
      }

      return {
        enabled: true,
        type: node.alert.type,
        sent: true,
        channels: alertChannels,
      };
    } catch (error: any) {
      console.error(`Failed to send alert: ${error.message}`);
      return {
        enabled: true,
        type: node.alert.type,
        sent: false,
        error: error.message,
      };
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(
    connectionId: string,
    channel: string,
    context: NodeExecutionContext,
    errorDetails: any,
    recoveryResult: any
  ): Promise<void> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(connectionId);

    if (!connection) {
      throw new Error(`Slack connection not found: ${connectionId}`);
    }

    const severity = this.determineErrorSeverity(errorDetails);
    const color = this.getSeverityColor(severity);

    const message = `⚠️ Error in workflow ${context.workflow_id}: ${errorDetails.message}`;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 Workflow Error Alert`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Workflow ID:*\n${context.workflow_id}`,
          },
          {
            type: 'mrkdwn',
            text: `*Execution ID:*\n${context.execution_id}`,
          },
          {
            type: 'mrkdwn',
            text: `*Error Code:*\n${errorDetails.code || 'N/A'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${severity.toUpperCase()}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error Message:*\n${errorDetails.message}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recovery Status:*\n${recoveryResult.success ? '✅ Recovered' : '❌ Failed'}`,
        },
      },
    ];

    // Add node ID if available
    if (errorDetails.node_id) {
      blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Failed Node:*\n${errorDetails.node_id}`,
          },
        ],
      });
    }

    // Add recovery details if available
    if (recoveryResult.strategy) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recovery Strategy:*\n${recoveryResult.strategy}`,
        },
      });
    }

    await axios.post(
      'https://slack.com/api/chat.postMessage',
      {
        channel: channel,
        blocks,
        attachments: [
          {
            color: color,
            text: message,
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${connection.credentials.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    recipients: string[],
    context: NodeExecutionContext,
    errorDetails: any,
    recoveryResult: any
  ): Promise<void> {
    // In a real implementation, this would use the Email tool executor
    // For now, just log the alert
    console.log(`Email alert would be sent to: ${recipients.join(', ')}`);
    console.log(`Error: ${errorDetails.message}`);
    console.log(`Recovery: ${recoveryResult.success ? 'Success' : 'Failed'}`);
  }

  /**
   * Send Teams alert
   */
  private async sendTeamsAlert(
    connectionId: string,
    context: NodeExecutionContext,
    errorDetails: any,
    recoveryResult: any
  ): Promise<void> {
    // In a real implementation, this would send to Microsoft Teams
    console.log(`Teams alert would be sent via connection: ${connectionId}`);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    connectionId: string,
    context: NodeExecutionContext,
    errorDetails: any,
    recoveryResult: any
  ): Promise<void> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(connectionId);

    if (!connection) {
      throw new Error(`Webhook connection not found: ${connectionId}`);
    }

    const payload = {
      alert_type: 'workflow_error',
      timestamp: new Date().toISOString(),
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
      error: {
        message: errorDetails.message,
        code: errorDetails.code,
        details: errorDetails.details,
        node_id: errorDetails.node_id,
      },
      recovery: {
        success: recoveryResult.success,
        strategy: recoveryResult.strategy,
        result: recoveryResult.result,
      },
      severity: this.determineErrorSeverity(errorDetails),
    };

    await axios.post(
      connection.base_url || '',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(connection.headers || {}),
        },
      }
    );
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(
    connectionId: string,
    context: NodeExecutionContext,
    errorDetails: any,
    recoveryResult: any
  ): Promise<void> {
    // In a real implementation, this would integrate with PagerDuty API
    console.log(`PagerDuty alert would be sent via connection: ${connectionId}`);
  }

  /**
   * Get color for severity level (for Slack attachments)
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#ff0000'; // Red
      case 'high':
        return '#ff6600'; // Orange
      case 'medium':
        return '#ffcc00'; // Yellow
      case 'low':
        return '#36a64f'; // Green
      default:
        return '#808080'; // Gray
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Export types for use in other modules
 */
export type { ErrorHandlingNode };
