import { BaseNodeExecutor } from "../../execution/base-executor";
import {
  WebhookTrigger,
  EventTrigger,
  ScheduleTrigger,
  NodeExecutionContext,
} from "../../types/nodes";
import { getEncryptionManager } from "../../encryption/manager";
import { getConnectionManager } from "../../connections/manager";
import cron from "node-cron";

/**
 * Webhook Trigger Executor
 * Handles webhook-based triggers for starting workflows
 */
export class WebhookTriggerExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: WebhookTrigger,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, ["endpoint_url", "method"]);

    // Resolve template variables in the configuration
    const resolvedConfig = this.resolveTemplate(
      {
        endpoint_url: node.endpoint_url,
        method: node.method,
        headers_expected: node.headers_expected,
        auth_required: node.auth_required,
        auth_type: node.auth_type,
        verification_secret: node.verification_secret,
      },
      context,
    );

    // Verify webhook signature if required
    if (resolvedConfig.verification_secret && context.input_data.signature) {
      this.verifyWebhookSignature(
        context.input_data,
        resolvedConfig.verification_secret,
      );
    }

    // Validate expected headers
    if (resolvedConfig.headers_expected) {
      this.validateExpectedHeaders(
        context.input_data.headers || {},
        resolvedConfig.headers_expected,
      );
    }

    // Validate payload against schema if provided
    if (node.payload_schema) {
      this.validatePayload(context.input_data, node.payload_schema);
    }

    // Return webhook data as output
    return {
      trigger_type: "webhook",
      method: resolvedConfig.method,
      endpoint: resolvedConfig.endpoint_url,
      payload: context.input_data,
      headers: context.input_data.headers || {},
      query_params: context.input_data.query_params || {},
      received_at: new Date().toISOString(),
      webhook_id: node.node_id,
    };
  }

  /**
   * Verify webhook signature for security
   */
  private verifyWebhookSignature(payload: any, secret: string): void {
    const encryptionManager = getEncryptionManager();
    const signature =
      payload.signature || payload["x-signature"] || payload["X-Signature"];
    const body = JSON.stringify(payload.body || payload);

    if (!signature) {
      throw new Error("Missing signature in webhook payload");
    }

    const computedSignature = encryptionManager.generateHMAC(body, secret);

    if (!encryptionManager.secureCompare(signature, computedSignature)) {
      throw new Error("Invalid webhook signature");
    }
  }

  /**
   * Validate expected headers are present
   */
  private validateExpectedHeaders(
    headers: Record<string, string>,
    expected: Record<string, string>,
  ): void {
    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = headers[key] || headers[key.toLowerCase()];

      if (!actualValue) {
        throw new Error(`Missing expected header: ${key}`);
      }

      if (expectedValue && actualValue !== expectedValue) {
        throw new Error(
          `Header ${key} has unexpected value. Expected: ${expectedValue}, Got: ${actualValue}`,
        );
      }
    }
  }

  /**
   * Validate payload against schema
   */
  private validatePayload(payload: any, schema: any): void {
    // Implement JSON schema validation
    // For now, just check required fields
    if (schema.required) {
      const missingFields = schema.required.filter(
        (field: string) => !(field in payload),
      );

      if (missingFields.length > 0) {
        throw new Error(
          `Missing required fields in payload: ${missingFields.join(", ")}`,
        );
      }
    }
  }
}

/**
 * Event Trigger Executor
 * Handles event-based triggers from platforms like Slack, Teams, Zoom, etc.
 */
export class EventTriggerExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: EventTrigger,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, [
      "platform",
      "connection_id",
      "event_type",
    ]);

    const connectionManager = getConnectionManager();

    // Get connection for the platform
    const connection = await connectionManager.getConnectionForExecution(
      node.connection_id,
      context.user_context?.user_id || "system",
      context.user_context?.role || "admin",
    );

    if (!connection) {
      throw new Error(`Connection not found: ${node.connection_id}`);
    }

    // Resolve template variables
    const resolvedConfig = this.resolveTemplate(
      {
        platform: node.platform,
        event_type: node.event_type,
        filters: node.filters,
        verification_token: node.verification_token,
      },
      context,
    );

    // Verify event if verification token is required
    if (resolvedConfig.verification_token) {
      this.verifyEventToken(
        context.input_data,
        resolvedConfig.verification_token,
      );
    }

    // Apply event filters
    if (resolvedConfig.filters) {
      this.applyEventFilters(context.input_data, resolvedConfig.filters);
    }

    // Platform-specific event processing
    const processedEvent = await this.processPlatformEvent(
      resolvedConfig.platform,
      context.input_data,
      connection,
    );

    return {
      trigger_type: "event",
      platform: resolvedConfig.platform,
      event_type: resolvedConfig.event_type,
      event_data: processedEvent,
      connection_id: node.connection_id,
      received_at: new Date().toISOString(),
      source: processedEvent.source || "unknown",
    };
  }

  /**
   * Verify event token for security
   */
  private verifyEventToken(payload: any, token: string): void {
    const eventToken = payload.token || payload.verification_token;

    if (!eventToken) {
      throw new Error("Missing verification token in event payload");
    }

    if (eventToken !== token) {
      throw new Error("Invalid verification token");
    }
  }

  /**
   * Apply event filters
   */
  private applyEventFilters(
    eventData: any,
    filters: Record<string, any>,
  ): void {
    for (const [key, filter] of Object.entries(filters)) {
      const eventValue = this.getNestedValue(eventData, key);

      if (typeof filter === "object" && filter !== null) {
        // Complex filter
        if (filter.equals !== undefined && eventValue !== filter.equals) {
          throw new Error(
            `Event filter failed: ${key} must equal ${filter.equals}`,
          );
        }
        if (
          filter.contains !== undefined &&
          !String(eventValue).includes(filter.contains)
        ) {
          throw new Error(
            `Event filter failed: ${key} must contain ${filter.contains}`,
          );
        }
        if (
          filter.regex !== undefined &&
          !new RegExp(filter.regex).test(String(eventValue))
        ) {
          throw new Error(
            `Event filter failed: ${key} does not match regex ${filter.regex}`,
          );
        }
      } else {
        // Simple equality check
        if (eventValue !== filter) {
          throw new Error(`Event filter failed: ${key} must equal ${filter}`);
        }
      }
    }
  }

  /**
   * Process platform-specific events
   */
  private async processPlatformEvent(
    platform: string,
    eventData: any,
    connection: any,
  ): Promise<any> {
    switch (platform) {
      case "slack":
        return this.processSlackEvent(eventData);
      case "teams":
        return this.processTeamsEvent(eventData);
      case "zoom":
        return this.processZoomEvent(eventData);
      case "github":
        return this.processGithubEvent(eventData);
      default:
        return eventData;
    }
  }

  /**
   * Process Slack event
   */
  private processSlackEvent(eventData: any): any {
    return {
      source: "slack",
      event_type: eventData.type || eventData.event?.type,
      team_id: eventData.team_id,
      user_id: eventData.user_id || eventData.event?.user,
      channel_id: eventData.channel_id || eventData.event?.channel,
      timestamp: eventData.event_time || eventData.event_ts,
      raw_event: eventData,
      parsed_data: {
        text: eventData.event?.text || eventData.text,
        blocks: eventData.event?.blocks,
        attachments: eventData.event?.attachments,
      },
    };
  }

  /**
   * Process Teams event
   */
  private processTeamsEvent(eventData: any): any {
    return {
      source: "teams",
      event_type: eventData.type,
      from: eventData.from,
      conversation: eventData.conversation,
      timestamp: eventData.timestamp,
      raw_event: eventData,
      parsed_data: {
        text: eventData.text,
        attachments: eventData.attachments,
        entities: eventData.entities,
      },
    };
  }

  /**
   * Process Zoom event
   */
  private processZoomEvent(eventData: any): any {
    return {
      source: "zoom",
      event_type: eventData.event,
      payload: eventData.payload,
      timestamp: eventData.event_ts,
      raw_event: eventData,
      parsed_data: {
        meeting_id: eventData.payload?.object?.id,
        host_id: eventData.payload?.object?.host_id,
        topic: eventData.payload?.object?.topic,
        start_time: eventData.payload?.object?.start_time,
      },
    };
  }

  /**
   * Process GitHub event
   */
  private processGithubEvent(eventData: any): any {
    return {
      source: "github",
      event_type: eventData.action || eventData.ref_type,
      repository: eventData.repository?.full_name,
      sender: eventData.sender?.login,
      timestamp: eventData.created_at || eventData.pushed_at,
      raw_event: eventData,
      parsed_data: {
        ref: eventData.ref,
        branch: eventData.ref,
        commit: eventData.after,
        before: eventData.before,
      },
    };
  }
}

/**
 * Schedule Trigger Executor
 * Handles time-based triggers using cron expressions
 */
export class ScheduleTriggerExecutor extends BaseNodeExecutor {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  protected async executeNode(
    node: ScheduleTrigger,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, ["cron_expression"]);

    // Resolve template variables
    const resolvedConfig = this.resolveTemplate(
      {
        cron_expression: node.cron_expression,
        timezone: node.timezone,
        start_date: node.start_date,
        end_date: node.end_date,
      },
      context,
    );

    // Validate cron expression
    if (!cron.validate(resolvedConfig.cron_expression)) {
      throw new Error(
        `Invalid cron expression: ${resolvedConfig.cron_expression}`,
      );
    }

    // Check date constraints
    this.checkDateConstraints(
      resolvedConfig.start_date,
      resolvedConfig.end_date,
    );

    // Return schedule information
    return {
      trigger_type: "schedule",
      cron_expression: resolvedConfig.cron_expression,
      timezone: resolvedConfig.timezone || "UTC",
      next_run: this.calculateNextRun(
        resolvedConfig.cron_expression,
        resolvedConfig.timezone,
      ),
      schedule_id: node.node_id,
      valid_date_range: {
        start: resolvedConfig.start_date,
        end: resolvedConfig.end_date,
      },
      triggered_at: new Date().toISOString(),
    };
  }

  /**
   * Validate date constraints
   */
  private checkDateConstraints(startDate?: string, endDate?: string): void {
    const now = new Date();

    if (startDate) {
      const start = new Date(startDate);
      if (now < start) {
        throw new Error(
          `Scheduled trigger has not started yet. Start date: ${startDate}`,
        );
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (now > end) {
        throw new Error(`Scheduled trigger has expired. End date: ${endDate}`);
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        throw new Error("Start date must be before end date");
      }
    }
  }

  /**
   * Calculate next scheduled run time
   */
  private calculateNextRun(cronExpression: string, timezone: string): string {
    // Use cron-parser or similar library for accurate calculation
    // For now, return a placeholder
    return new Date(Date.now() + 60000).toISOString(); // Next minute as placeholder
  }

  /**
   * Schedule a task (for external scheduling system)
   */
  public scheduleTask(node: ScheduleTrigger, callback: () => void): boolean {
    try {
      const task = cron.schedule(node.cron_expression, callback, {
        timezone: node.timezone || "UTC",
      });

      this.scheduledTasks.set(node.node_id, task);
      return true;
    } catch (error) {
      console.error(`Failed to schedule task for node ${node.node_id}:`, error);
      return false;
    }
  }

  /**
   * Unschedule a task
   */
  public unscheduleTask(nodeId: string): boolean {
    const task = this.scheduledTasks.get(nodeId);

    if (!task) {
      return false;
    }

    task.stop();
    this.scheduledTasks.delete(nodeId);
    return true;
  }

  /**
   * Get all scheduled tasks
   */
  public getScheduledTasks(): string[] {
    return Array.from(this.scheduledTasks.keys());
  }

  /**
   * Clear all scheduled tasks
   */
  public clearAllScheduledTasks(): void {
    this.scheduledTasks.forEach((task) => task.stop());
    this.scheduledTasks.clear();
  }

  /**
   * Validate schedule configuration
   */
  public static validateScheduleConfig(
    cronExpression: string,
    timezone?: string,
  ): { valid: boolean; error?: string } {
    if (!cron.validate(cronExpression)) {
      return {
        valid: false,
        error: `Invalid cron expression: ${cronExpression}`,
      };
    }

    // Validate timezone if provided
    if (timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch (error) {
        return {
          valid: false,
          error: `Invalid timezone: ${timezone}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get human-readable schedule description
   */
  public static getScheduleDescription(cronExpression: string): string {
    // Parse cron expression and return human-readable description
    // For now, return the expression itself
    return cronExpression;
  }

  /**
   * Get next n run times
   */
  public static getNextRunTimes(
    cronExpression: string,
    timezone: string,
    count: number = 5,
  ): string[] {
    // Calculate next n run times based on cron expression
    // For now, return placeholder values
    const times: string[] = [];
    const now = Date.now();

    for (let i = 1; i <= count; i++) {
      times.push(new Date(now + i * 60000).toISOString());
    }

    return times;
  }
}

/**
 * Trigger Node Executors Registry
 * Provides easy access to all trigger executors
 */
export const TriggerExecutors = {
  Webhook: WebhookTriggerExecutor,
  Event: EventTriggerExecutor,
  Schedule: ScheduleTriggerExecutor,
};

/**
 * Export types for use in other modules
 */
export type { WebhookTrigger, EventTrigger, ScheduleTrigger };
