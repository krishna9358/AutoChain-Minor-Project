import { BaseNodeExecutor } from "../../execution/base-executor";
import {
  HttpToolNode,
  DatabaseToolNode,
  EmailToolNode,
  SlackToolNode,
  BrowserToolNode,
  NodeExecutionContext,
} from "../../types/nodes";
import { getConnectionManager } from "../../connections/manager";
import axios, { AxiosInstance } from "axios";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import * as sgMail from "@sendgrid/mail";

/**
 * HTTP Tool Executor
 * Handles HTTP requests to external APIs and services
 */
export class HttpToolExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: HttpToolNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, ["connection_id", "method", "url"]);

    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnectionForExecution(
      node.connection_id,
      context.user_context?.user_id || "system",
      context.user_context?.role as any || "admin",
    );

    if (!connection) {
      throw new Error(`Connection not found: ${node.connection_id}`);
    }

    // Resolve template variables
    const resolvedConfig = this.resolveTemplate(
      {
        method: node.method,
        url: node.url,
        headers: node.headers,
        query_params: node.query_params,
        body: node.body,
      },
      context,
    );

    // Create axios instance with connection configuration
    const httpClient = this.createHttpClient(connection, resolvedConfig);

    // Make HTTP request
    const response = await this.makeHttpRequest(
      httpClient,
      resolvedConfig.method,
      resolvedConfig.url,
      resolvedConfig.query_params,
      resolvedConfig.body,
    );

    // Validate response if configured
    if (node.validation) {
      this.validateResponse(response, node.validation);
    }

    return {
      tool_type: "http",
      connection_id: node.connection_id,
      request: {
        method: resolvedConfig.method,
        url: connection.base_url + resolvedConfig.url,
        headers: this.sanitizeHeaders(resolvedConfig.headers || {}),
        query_params: resolvedConfig.query_params,
        body: node.body ? this.sanitizeBody(resolvedConfig.body) : undefined,
      },
      response: {
        status: response.status,
        status_text: response.statusText,
        headers: response.headers,
        data: response.data,
      },
      metadata: {
        duration_ms: response.duration_ms,
        size_bytes: response.size_bytes,
      },
    };
  }

  /**
   * Create HTTP client with connection configuration
   */
  private createHttpClient(connection: any, config: any): AxiosInstance {
    const headers: Record<string, string> = {
      ...(connection.headers || {}),
      ...(config.headers || {}),
    };

    // Add authentication based on connection type
    if (connection.credentials?.api_key) {
      headers["Authorization"] = `Bearer ${connection.credentials.api_key}`;
    } else if (connection.credentials?.access_token) {
      headers["Authorization"] =
        `Bearer ${connection.credentials.access_token}`;
    } else if (connection.credentials?.bearer_token) {
      headers["Authorization"] =
        `Bearer ${connection.credentials.bearer_token}`;
    } else if (
      connection.credentials?.username &&
      connection.credentials?.password
    ) {
      const auth = Buffer.from(
        `${connection.credentials.username}:${connection.credentials.password}`,
      ).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    return axios.create({
      baseURL: connection.base_url,
      headers,
      timeout: config.timeout || 10000,
      maxRedirects: 5,
    });
  }

  /**
   * Make HTTP request
   */
  private async makeHttpRequest(
    httpClient: AxiosInstance,
    method: string,
    url: string,
    queryParams?: any,
    body?: any,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await httpClient.request({
        method,
        url,
        params: queryParams,
        data: body,
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        duration_ms: Date.now() - startTime,
        size_bytes: JSON.stringify(response.data).length,
      };
    } catch (error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
          duration_ms: Date.now() - startTime,
          size_bytes: JSON.stringify(error.response.data).length,
          error: error.message,
        };
      }
      throw error;
    }
  }

  /**
   * Validate response
   */
  private validateResponse(response: any, validation: any): void {
    if (validation.status_code && response.status !== validation.status_code) {
      throw new Error(
        `Unexpected status code. Expected: ${validation.status_code}, Got: ${response.status}`,
      );
    }

    if (validation.schema) {
      this.validateSchema(response.data, validation.schema);
    }
  }

  /**
   * Validate response against schema
   */
  private validateSchema(data: any, schema: any): void {
    // Implement JSON schema validation
    // For now, just check required fields
    if (schema.required) {
      const missingFields = schema.required.filter(
        (field: string) => !(field in data),
      );
      if (missingFields.length > 0) {
        throw new Error(
          `Missing required fields in response: ${missingFields.join(", ")}`,
        );
      }
    }
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = [
      "authorization",
      "cookie",
      "set-cookie",
      "x-api-key",
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = "***REDACTED***";
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize body for logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sensitiveKeys = ['password', 'secret', 'token', 'api_key', 'apiKey', 'authorization'];
    const sanitized: any = Array.isArray(body) ? [] : {};
    for (const [key, value] of Object.entries(body)) {
      sanitized[key] = sensitiveKeys.some(k => key.toLowerCase().includes(k))
        ? '***REDACTED***'
        : value;
    }
    return sanitized;
  }
}

/**
 * Database Tool Executor
 * Handles database operations for various database types
 */
export class DatabaseToolExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: DatabaseToolNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, [
      "connection_id",
      "db_type",
      "operation",
    ]);

    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnectionForExecution(
      node.connection_id,
      context.user_context?.user_id || "system",
      context.user_context?.role as any || "admin",
    );

    if (!connection) {
      throw new Error(`Connection not found: ${node.connection_id}`);
    }

    // Resolve template variables
    const resolvedConfig = this.resolveTemplate(
      {
        query: node.query,
        table: node.table,
        data: node.data,
        parameters: node.parameters,
      },
      context,
    );

    // Execute database operation
    const result = await this.executeDatabaseOperation(
      connection,
      node.db_type,
      node.operation,
      resolvedConfig,
    );

    return {
      tool_type: "database",
      connection_id: node.connection_id,
      db_type: node.db_type,
      operation: node.operation,
      query: node.query ? this.sanitizeQuery(resolvedConfig.query) : undefined,
      table: node.table,
      parameters: resolvedConfig.parameters,
      result: {
        rows: result.rows,
        affected_rows: result.affected_rows,
        insert_id: result.insert_id,
      },
      metadata: {
        duration_ms: result.duration_ms,
        rows_returned: result.rows?.length || 0,
      },
    };
  }

  /**
   * Execute database operation
   */
  private async executeDatabaseOperation(
    connection: any,
    dbType: string,
    operation: string,
    config: any,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      let result: any;
      switch (dbType) {
        case "postgres":
          result = await this.executePostgresOperation(
            connection,
            operation,
            config,
          );
          break;
        case "mysql":
          result = await this.executeMySQLOperation(
            connection,
            operation,
            config,
          );
          break;
        case "mongodb":
          result = await this.executeMongoDBOperation(
            connection,
            operation,
            config,
          );
          break;
        case "sqlite":
          result = await this.executeSQLiteOperation(
            connection,
            operation,
            config,
          );
          break;
        case "redis":
          result = await this.executeRedisOperation(
            connection,
            operation,
            config,
          );
          break;
        case "elasticsearch":
          result = await this.executeElasticsearchOperation(
            connection,
            operation,
            config,
          );
          break;
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
      return { ...result, duration_ms: Date.now() - startTime };
    } catch (error: any) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
  }

  /**
   * Execute PostgreSQL operation
   */
  private async executePostgresOperation(
    connection: any,
    operation: string,
    config: any,
  ): Promise<any> {
    // Implementation would use pg library
    // Placeholder implementation
    switch (operation) {
      case "select":
        return { rows: [], affected_rows: 0 };
      case "insert":
        return { rows: [], affected_rows: 1, insert_id: "1" };
      case "update":
        return { rows: [], affected_rows: 1 };
      case "delete":
        return { rows: [], affected_rows: 1 };
      default:
        return { rows: [], affected_rows: 0 };
    }
  }

  /**
   * Execute MySQL operation
   */
  private async executeMySQLOperation(
    connection: any,
    operation: string,
    config: any,
  ): Promise<any> {
    // Implementation would use mysql2 library
    return { rows: [], affected_rows: 0 };
  }

  /**
   * Execute MongoDB operation
   */
  private async executeMongoDBOperation(
    connection: any,
    operation: string,
    config: any,
  ): Promise<any> {
    // Implementation would use mongodb library
    return { rows: [], affected_rows: 0 };
  }

  /**
   * Execute SQLite operation
   */
  private async executeSQLiteOperation(
    connection: any,
    operation: string,
    config: any,
  ): Promise<any> {
    // Implementation would use better-sqlite3 or sqlite3 library
    return { rows: [], affected_rows: 0 };
  }

  /**
   * Execute Redis operation
   */
  private async executeRedisOperation(
    connection: any,
    operation: string,
    config: any,
  ): Promise<any> {
    // Implementation would use ioredis library
    return { rows: [], affected_rows: 0 };
  }

  /**
   * Execute Elasticsearch operation
   */
  private async executeElasticsearchOperation(
    connection: any,
    operation: string,
    config: any,
  ): Promise<any> {
    // Implementation would use @elastic/elasticsearch library
    return { rows: [], affected_rows: 0 };
  }

  /**
   * Sanitize query for logging
   */
  private sanitizeQuery(query: string): string {
    // Remove sensitive data from query
    return query.replace(/\b(password\s*=\s*'[^']*')\b/gi, "password='***'");
  }
}

/**
 * Email Tool Executor
 * Handles sending emails via various providers
 */
export class EmailToolExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: EmailToolNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, [
      "provider",
      "from",
      "to",
      "subject",
      "body",
    ]);

    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnectionForExecution(
      node.connection_id,
      context.user_context?.user_id || "system",
      context.user_context?.role as any || "admin",
    );

    if (!connection) {
      throw new Error(`Connection not found: ${node.connection_id}`);
    }

    // Resolve template variables
    const resolvedConfig = this.resolveTemplate(
      {
        from: node.from,
        to: node.to,
        cc: node.cc,
        bcc: node.bcc,
        subject: node.subject,
        body: node.body,
        template_id: node.template_id,
        template_data: node.template_data,
      },
      context,
    );

    // Send email
    const result = await this.sendEmail(
      node.provider,
      connection,
      resolvedConfig,
      node.body_type,
    );

    return {
      tool_type: "email",
      provider: node.provider,
      connection_id: node.connection_id,
      from: resolvedConfig.from,
      to: this.sanitizeEmailAddresses(resolvedConfig.to),
      cc: node.cc ? this.sanitizeEmailAddresses(resolvedConfig.cc) : undefined,
      bcc: node.bcc
        ? this.sanitizeEmailAddresses(resolvedConfig.bcc)
        : undefined,
      subject: resolvedConfig.subject,
      body_preview: resolvedConfig.body.substring(0, 100) + "...",
      template_id: node.template_id,
      result: {
        message_id: result.message_id,
        accepted: result.accepted,
        rejected: result.rejected,
        status: result.status,
      },
      metadata: {
        duration_ms: result.duration_ms,
        attachments_count: node.attachments?.length || 0,
        tracking_enabled:
          node.tracking?.opens || node.tracking?.clicks || false,
      },
    };
  }

  /**
   * Send email via provider
   */
  private async sendEmail(
    provider: string,
    connection: any,
    config: any,
    bodyType: string,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      switch (provider) {
        case "sendgrid":
          return await this.sendViaSendGrid(connection, config, bodyType);
        case "ses":
          return await this.sendViaSES(connection, config, bodyType);
        case "mailgun":
          return await this.sendViaMailgun(connection, config, bodyType);
        case "smtp":
          return await this.sendViaSMTP(connection, config, bodyType);
        case "postmark":
          return await this.sendViaPostmark(connection, config, bodyType);
        default:
          throw new Error(`Unsupported email provider: ${provider}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(
    connection: any,
    config: any,
    bodyType: string,
  ): Promise<any> {
    sgMail.setApiKey(connection.credentials.api_key);

    const msg: any = {
      to: config.to,
      from: config.from,
      subject: config.subject,
    };

    if (bodyType === "html") {
      msg.html = config.body;
    } else {
      msg.text = config.body;
    }

    if (config.cc) msg.cc = config.cc;
    if (config.bcc) msg.bcc = config.bcc;
    if (config.template_id) msg.templateId = config.template_id;
    if (config.template_data) msg.dynamicTemplateData = config.template_data;

    const response = await sgMail.send(msg);

    return {
      message_id: response[0].headers["x-message-id"],
      accepted: [config.to],
      rejected: [],
      status: "sent",
      duration_ms: 0,
    };
  }

  /**
   * Send via AWS SES
   */
  private async sendViaSES(
    connection: any,
    config: any,
    bodyType: string,
  ): Promise<any> {
    // Implementation would use AWS SES SDK
    return {
      message_id: "ses-message-id",
      accepted: [config.to],
      rejected: [],
      status: "sent",
      duration_ms: 0,
    };
  }

  /**
   * Send via Mailgun
   */
  private async sendViaMailgun(
    connection: any,
    config: any,
    bodyType: string,
  ): Promise<any> {
    // Implementation would use Mailgun SDK
    return {
      message_id: "mailgun-message-id",
      accepted: [config.to],
      rejected: [],
      status: "sent",
      duration_ms: 0,
    };
  }

  /**
   * Send via SMTP
   */
  private async sendViaSMTP(
    connection: any,
    config: any,
    bodyType: string,
  ): Promise<any> {
    // Implementation would use nodemailer
    return {
      message_id: "smtp-message-id",
      accepted: [config.to],
      rejected: [],
      status: "sent",
      duration_ms: 0,
    };
  }

  /**
   * Send via Postmark
   */
  private async sendViaPostmark(
    connection: any,
    config: any,
    bodyType: string,
  ): Promise<any> {
    // Implementation would use Postmark SDK
    return {
      message_id: "postmark-message-id",
      accepted: [config.to],
      rejected: [],
      status: "sent",
      duration_ms: 0,
    };
  }

  /**
   * Sanitize email addresses for logging
   */
  private sanitizeEmailAddresses(addresses: string | string[]): string {
    if (typeof addresses === "string") {
      return addresses;
    }
    return addresses.join(", ");
  }
}

/**
 * Slack Tool Executor
 * Handles sending messages to Slack channels
 */
export class SlackToolExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: SlackToolNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, ["connection_id", "channel", "message"]);

    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnectionForExecution(
      node.connection_id,
      context.user_context?.user_id || "system",
      context.user_context?.role as any || "admin",
    );

    if (!connection) {
      throw new Error(`Connection not found: ${node.connection_id}`);
    }

    // Resolve template variables
    const resolvedConfig = this.resolveTemplate(
      {
        channel: node.channel,
        message: node.message,
        blocks: node.blocks,
        attachments: node.attachments,
        thread_ts: node.thread_ts,
        reply_broadcast: node.reply_broadcast,
        username: node.username,
        icon_emoji: node.icon_emoji,
        icon_url: node.icon_url,
      },
      context,
    );

    // Send message to Slack
    const result = await this.sendSlackMessage(connection, resolvedConfig);

    return {
      tool_type: "slack",
      connection_id: node.connection_id,
      channel: resolvedConfig.channel,
      message: resolvedConfig.message.substring(0, 100) + "...",
      blocks: resolvedConfig.blocks?.length || 0,
      attachments: resolvedConfig.attachments?.length || 0,
      result: {
        ok: result.ok,
        channel: result.channel,
        timestamp: result.ts,
        message_ts: result.message_ts,
      },
      metadata: {
        duration_ms: result.duration_ms,
        thread_ts: resolvedConfig.thread_ts,
        reply_broadcast: node.reply_broadcast,
      },
    };
  }

  /**
   * Send message to Slack
   */
  private async sendSlackMessage(connection: any, config: any): Promise<any> {
    const startTime = Date.now();

    try {
      const message: any = {
        channel: config.channel,
        text: config.message,
      };

      if (config.blocks) message.blocks = config.blocks;
      if (config.attachments) message.attachments = config.attachments;
      if (config.thread_ts) {
        message.thread_ts = config.thread_ts;
        if (config.reply_broadcast) message.reply_broadcast = true;
      }
      if (config.username) message.username = config.username;
      if (config.icon_emoji) message.icon_emoji = config.icon_emoji;
      if (config.icon_url) message.icon_url = config.icon_url;

      const response = await axios.post(
        "https://slack.com/api/chat.postMessage",
        message,
        {
          headers: {
            Authorization: `Bearer ${connection.credentials.access_token || connection.credentials.api_key}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        ok: response.data.ok,
        channel: response.data.channel,
        ts: response.data.ts,
        message_ts: response.data.ts,
        duration_ms: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(`Failed to send Slack message: ${error.message}`);
    }
  }
}

/**
 * Browser Automation Tool Executor
 * Handles browser automation using Playwright
 */
export class BrowserToolExecutor extends BaseNodeExecutor {
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, BrowserContext> = new Map();

  protected async executeNode(
    node: BrowserToolNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, ["engine", "url", "actions"]);

    // Resolve template variables
    const resolvedConfig = this.resolveTemplate(
      {
        url: node.url,
        actions: node.actions,
        viewport: node.viewport,
      },
      context,
    );

    // Execute browser automation
    const result = await this.executeBrowserAutomation(
      node.engine,
      resolvedConfig,
      node.headless,
      node.timeout,
      node.screenshot,
    );

    return {
      tool_type: "browser",
      engine: node.engine,
      url: resolvedConfig.url,
      actions_executed: result.actions_executed,
      result: {
        html: result.html,
        text: result.text,
        json: result.json,
        screenshot: result.screenshot,
      },
      metadata: {
        duration_ms: result.duration_ms,
        viewport: node.viewport || { width: 1920, height: 1080 },
        actions_count: node.actions.length,
      },
    };
  }

  /**
   * Execute browser automation
   */
  private async executeBrowserAutomation(
    engine: string,
    config: any,
    headless: boolean,
    timeout: number,
    screenshot: boolean,
  ): Promise<any> {
    const startTime = Date.now();
    let browser: Browser | null = null;

    try {
      // Launch browser
      browser = await chromium.launch({
        headless,
        timeout,
      });

      const browserContext = await browser.newContext({
        viewport: config.viewport || { width: 1920, height: 1080 },
      });

      const page = await browserContext.newPage();

      // Navigate to URL
      await page.goto(config.url, { waitUntil: "networkidle", timeout });

      // Execute actions
      const actionsExecuted: any[] = [];

      for (const action of config.actions) {
        const actionResult = await this.executeBrowserAction(page, action);
        actionsExecuted.push({
          type: action.type,
          selector: action.selector,
          success: actionResult.success,
          error: actionResult.error,
        });

        if (!actionResult.success && !action.continue_on_error) {
          throw new Error(`Action failed: ${actionResult.error}`);
        }
      }

      // Get result based on return format
      let html: string | undefined;
      let text: string | undefined;
      let json: any | undefined;
      let screenshotData: string | undefined;

      // Default to text result
      text = await page.textContent("body") || undefined;

      // Capture screenshot if requested
      if (screenshot) {
        const screenshot = await page.screenshot({
          encoding: "base64",
          fullPage: false,
        } as any);
        screenshotData = screenshot.toString();
      }

      return {
        html,
        text,
        json,
        screenshot: screenshotData,
        actions_executed: actionsExecuted,
        duration_ms: Date.now() - startTime,
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Execute individual browser action
   */
  private async executeBrowserAction(
    page: Page,
    action: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (action.type) {
        case "click":
          await page.click(action.selector, {
            timeout: action.timeout || 5000,
          });
          break;

        case "type":
          await page.fill(action.selector, action.value, {
            timeout: action.timeout || 5000,
          });
          break;

        case "select":
          await page.selectOption(action.selector, action.value, {
            timeout: action.timeout || 5000,
          });
          break;

        case "scroll":
          await page.evaluate((selector: string) => {
            const element = document.querySelector(selector);
            if (element) element.scrollIntoView({ behavior: "smooth" });
          }, action.selector);
          break;

        case "wait":
          if (action.selector) {
            await page.waitForSelector(action.selector, {
              timeout: action.timeout || 5000,
            });
          } else {
            await page.waitForTimeout(action.value || 1000);
          }
          break;

        case "navigate":
          await page.goto(action.value, {
            waitUntil: action.wait_until || "networkidle",
            timeout: action.timeout || 30000,
          });
          break;

        case "screenshot":
          await page.screenshot({
            path: action.value,
            fullPage: action.fullPage || false,
          });
          break;

        case "execute_script":
          await page.evaluate(action.value);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up browser resources
   */
  public async cleanup(): Promise<void> {
    for (const [id, browser] of this.browsers.entries()) {
      await browser.close();
      this.browsers.delete(id);
    }
    this.contexts.clear();
  }
}

/**
 * Tool Node Executors Registry
 * Provides easy access to all tool executors
 */
export const ToolExecutors = {
  Http: HttpToolExecutor,
  Database: DatabaseToolExecutor,
  Email: EmailToolExecutor,
  Slack: SlackToolExecutor,
  Browser: BrowserToolExecutor,
};

/**
 * Export types for use in other modules
 */
export type {
  HttpToolNode,
  DatabaseToolNode,
  EmailToolNode,
  SlackToolNode,
  BrowserToolNode,
};
