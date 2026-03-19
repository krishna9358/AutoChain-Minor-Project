import { Router } from "express";
import { z } from "zod";

export const componentCatalogRouter = Router();

export type ComponentCategory =
  | "input"
  | "core"
  | "logic"
  | "ai"
  | "output"
  | "integration"
  | "control";

export type ConfigFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "json"
  | "password"
  | "url"
  | "email"
  | "multi-select";

export interface ComponentConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  description?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  rows?: number;
  options?: Array<{ label: string; value: string }>;
}

export interface WorkflowComponentDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  icon: string;
  category: ComponentCategory;
  tags?: string[];
  configFields: ComponentConfigField[];
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  configSchema: z.ZodTypeAny;
}

const JsonRecordSchema = z.record(z.any());

const Components: WorkflowComponentDefinition[] = [
  // ─── INPUT ──────────────────────────────────────────────────
  {
    id: "entry-point",
    version: "1.0.0",
    name: "Entry Point",
    description: "Starts a workflow via webhook, API call, schedule, or manual trigger.",
    icon: "Play",
    category: "input",
    tags: ["trigger", "start", "entry", "webhook", "cron"],
    configFields: [
      {
        key: "triggerMode",
        label: "Trigger Mode",
        type: "select",
        required: true,
        defaultValue: "manual",
        description: "How this workflow gets triggered",
        options: [
          { label: "Manual", value: "manual" },
          { label: "Webhook", value: "webhook" },
          { label: "Schedule (Cron)", value: "schedule" },
          { label: "API Call", value: "api" },
        ],
      },
      {
        key: "webhookPath",
        label: "Webhook Path",
        type: "text",
        placeholder: "/incoming/orders",
        description: "URL path for incoming webhook requests (when trigger mode is Webhook)",
      },
      {
        key: "cron",
        label: "Cron Expression",
        type: "text",
        placeholder: "0 */6 * * *",
        description: "Cron schedule expression (when trigger mode is Schedule)",
      },
      {
        key: "inputSchema",
        label: "Input Schema (JSON)",
        type: "json",
        rows: 4,
        defaultValue: {},
        description: "JSON Schema defining the expected input payload structure",
      },
    ],
    configSchema: z
      .object({
        triggerMode: z.enum(["manual", "webhook", "schedule", "api"]).default("manual"),
        webhookPath: z.string().optional(),
        cron: z.string().optional(),
        inputSchema: JsonRecordSchema.optional(),
      })
      .superRefine((v, ctx) => {
        if (v.triggerMode === "webhook" && !v.webhookPath) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["webhookPath"],
            message: "webhookPath is required when triggerMode is webhook",
          });
        }
        if (v.triggerMode === "schedule" && !v.cron) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cron"],
            message: "cron expression is required when triggerMode is schedule",
          });
        }
      }),
    outputSchema: z.object({ payload: z.any(), metadata: z.record(z.any()).optional() }),
  },

  // ─── INTEGRATION ────────────────────────────────────────────
  {
    id: "http-request",
    version: "1.0.0",
    name: "HTTP Request",
    description: "Performs an outbound HTTP request to an external API or service.",
    icon: "Globe",
    category: "integration",
    tags: ["api", "rest", "http", "fetch", "request"],
    configFields: [
      {
        key: "method",
        label: "HTTP Method",
        type: "select",
        required: true,
        defaultValue: "GET",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
          { label: "DELETE", value: "DELETE" },
        ],
      },
      { key: "url", label: "Request URL", type: "url", required: true, placeholder: "https://api.example.com/v1/items", description: "Full URL including protocol" },
      {
        key: "authType",
        label: "Authentication",
        type: "select",
        defaultValue: "none",
        description: "How to authenticate with the target API",
        options: [
          { label: "None", value: "none" },
          { label: "Bearer Token", value: "bearer" },
          { label: "API Key (Header)", value: "api-key" },
          { label: "Basic Auth", value: "basic" },
        ],
      },
      { key: "authValue", label: "Auth Token / Key", type: "password", placeholder: "Enter token or use {{secrets.MY_KEY}}", description: "Authentication credential (supports secret references)" },
      { key: "headers", label: "Headers (JSON)", type: "json", rows: 3, defaultValue: {}, description: "Custom request headers as key-value pairs" },
      { key: "query", label: "Query Parameters (JSON)", type: "json", rows: 3, defaultValue: {}, description: "URL query parameters as key-value pairs" },
      { key: "body", label: "Request Body (JSON)", type: "json", rows: 5, defaultValue: {}, description: "Request body payload (for POST/PUT/PATCH)" },
      { key: "timeoutMs", label: "Timeout (ms)", type: "number", defaultValue: 15000, min: 1000, max: 120000, description: "Max time to wait for a response" },
      { key: "retryCount", label: "Retry Count", type: "number", defaultValue: 1, min: 0, max: 10, description: "Number of retries on failure" },
    ],
    configSchema: z.object({
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
      url: z.string().min(1),
      authType: z.enum(["none", "bearer", "api-key", "basic"]).default("none"),
      authValue: z.string().optional(),
      headers: JsonRecordSchema.optional().default({}),
      query: JsonRecordSchema.optional().default({}),
      body: z.any().optional(),
      timeoutMs: z.number().int().min(1000).max(120000).default(15000),
      retryCount: z.number().int().min(0).max(10).default(1),
    }),
    inputSchema: z.object({ payload: z.any().optional(), context: z.record(z.any()).optional() }),
    outputSchema: z.object({ status: z.number(), headers: z.record(z.any()).optional(), data: z.any().optional() }),
  },
  {
    id: "slack-send",
    version: "1.0.0",
    name: "Slack Message",
    description: "Sends a message to a Slack channel or user via webhook or Bot API.",
    icon: "MessageSquare",
    category: "integration",
    tags: ["slack", "message", "notification", "chat"],
    configFields: [
      {
        key: "mode",
        label: "Send Mode",
        type: "select",
        required: true,
        defaultValue: "webhook",
        options: [
          { label: "Incoming Webhook", value: "webhook" },
          { label: "Bot API (token)", value: "bot" },
        ],
      },
      { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://hooks.slack.com/services/...", description: "Slack incoming webhook URL" },
      { key: "botToken", label: "Bot Token", type: "password", placeholder: "xoxb-...", description: "Slack Bot token (when using Bot API mode)" },
      { key: "channel", label: "Channel", type: "text", required: true, placeholder: "#general", description: "Channel name (e.g. #general) or user ID" },
      { key: "message", label: "Message", type: "textarea", required: true, rows: 4, placeholder: "Hello from AutoChain! Status: {{payload.status}}", description: "Message text — supports {{variable}} template syntax" },
      { key: "username", label: "Bot Username", type: "text", placeholder: "AutoChain Bot", description: "Display name for the bot message" },
      { key: "iconEmoji", label: "Icon Emoji", type: "text", placeholder: ":robot_face:", description: "Emoji to use as the bot avatar" },
    ],
    configSchema: z.object({
      mode: z.enum(["webhook", "bot"]).default("webhook"),
      webhookUrl: z.string().optional(),
      botToken: z.string().optional(),
      channel: z.string().min(1),
      message: z.string().min(1),
      username: z.string().optional(),
      iconEmoji: z.string().optional(),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ ok: z.boolean(), ts: z.string().optional() }),
  },
  {
    id: "email-send",
    version: "1.0.0",
    name: "Send Email",
    description: "Sends an email via SMTP or an email service provider.",
    icon: "Mail",
    category: "integration",
    tags: ["email", "smtp", "send", "notification"],
    configFields: [
      {
        key: "provider",
        label: "Provider",
        type: "select",
        required: true,
        defaultValue: "smtp",
        options: [
          { label: "SMTP", value: "smtp" },
          { label: "SendGrid", value: "sendgrid" },
          { label: "Mailgun", value: "mailgun" },
          { label: "AWS SES", value: "ses" },
        ],
      },
      { key: "apiKey", label: "API Key / Password", type: "password", placeholder: "Enter API key or use {{secrets.EMAIL_KEY}}", description: "Service API key or SMTP password" },
      { key: "smtpHost", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com", description: "SMTP server hostname (for SMTP provider)" },
      { key: "smtpPort", label: "SMTP Port", type: "number", defaultValue: 587, min: 1, max: 65535, description: "SMTP server port" },
      { key: "from", label: "From Address", type: "email", required: true, placeholder: "noreply@yourcompany.com" },
      { key: "to", label: "To Address(es)", type: "text", required: true, placeholder: "user@example.com, admin@example.com", description: "Comma-separated email addresses" },
      { key: "subject", label: "Subject", type: "text", required: true, placeholder: "Workflow Report — {{payload.date}}", description: "Email subject line — supports {{variable}} syntax" },
      { key: "body", label: "Email Body", type: "textarea", required: true, rows: 6, placeholder: "Hi {{payload.name}},\n\nYour report is ready.\n\nBest,\nAutoChain", description: "Email body content — supports {{variable}} syntax" },
      { key: "isHtml", label: "Send as HTML", type: "boolean", defaultValue: false, description: "Treat the body as HTML instead of plain text" },
    ],
    configSchema: z.object({
      provider: z.enum(["smtp", "sendgrid", "mailgun", "ses"]).default("smtp"),
      apiKey: z.string().optional(),
      smtpHost: z.string().optional(),
      smtpPort: z.number().int().min(1).max(65535).default(587),
      from: z.string().email(),
      to: z.string().min(1),
      subject: z.string().min(1),
      body: z.string().min(1),
      isHtml: z.boolean().default(false),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ messageId: z.string().optional(), accepted: z.array(z.string()).optional() }),
  },
  {
    id: "db-query",
    version: "1.0.0",
    name: "Database Query",
    description: "Executes a SQL query or database operation against a connected database.",
    icon: "Database",
    category: "integration",
    tags: ["database", "sql", "query", "postgres", "mysql"],
    configFields: [
      {
        key: "dbType",
        label: "Database Type",
        type: "select",
        required: true,
        defaultValue: "postgresql",
        options: [
          { label: "PostgreSQL", value: "postgresql" },
          { label: "MySQL", value: "mysql" },
          { label: "SQLite", value: "sqlite" },
          { label: "MongoDB", value: "mongodb" },
        ],
      },
      { key: "connectionString", label: "Connection String", type: "password", required: true, placeholder: "postgresql://user:pass@host:5432/db", description: "Database connection URL (use {{secrets.DB_URL}} for security)" },
      {
        key: "operation",
        label: "Operation",
        type: "select",
        required: true,
        defaultValue: "query",
        options: [
          { label: "Raw Query", value: "query" },
          { label: "Insert", value: "insert" },
          { label: "Update", value: "update" },
          { label: "Delete", value: "delete" },
        ],
      },
      { key: "query", label: "SQL Query", type: "textarea", required: true, rows: 5, placeholder: "SELECT * FROM users WHERE status = $1", description: "SQL query with $1, $2 parameter placeholders" },
      { key: "params", label: "Query Parameters (JSON)", type: "json", rows: 2, defaultValue: [], description: "Array of parameter values for the query placeholders" },
      { key: "timeout", label: "Query Timeout (ms)", type: "number", defaultValue: 30000, min: 1000, max: 300000 },
    ],
    configSchema: z.object({
      dbType: z.enum(["postgresql", "mysql", "sqlite", "mongodb"]).default("postgresql"),
      connectionString: z.string().min(1),
      operation: z.enum(["query", "insert", "update", "delete"]).default("query"),
      query: z.string().min(1),
      params: z.any().optional().default([]),
      timeout: z.number().int().min(1000).max(300000).default(30000),
    }),
    inputSchema: z.object({ payload: z.any().optional() }),
    outputSchema: z.object({ rows: z.array(z.any()).optional(), rowCount: z.number().optional() }),
  },

  // ─── LOGIC ──────────────────────────────────────────────────
  {
    id: "if-condition",
    version: "1.0.0",
    name: "If / Else",
    description: "Branches the workflow based on a condition expression.",
    icon: "GitBranch",
    category: "logic",
    tags: ["branch", "condition", "if", "else", "filter"],
    configFields: [
      {
        key: "leftPath",
        label: "Value to Check",
        type: "text",
        required: true,
        placeholder: "payload.customer.tier",
        description: "Dot-notation path to the value being evaluated (from previous step output)",
      },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        required: true,
        defaultValue: "equals",
        options: [
          { label: "Equals (==)", value: "equals" },
          { label: "Not Equals (!=)", value: "not_equals" },
          { label: "Contains", value: "contains" },
          { label: "Greater Than (>)", value: "gt" },
          { label: "Less Than (<)", value: "lt" },
          { label: "Greater or Equal (>=)", value: "gte" },
          { label: "Less or Equal (<=)", value: "lte" },
          { label: "Is Empty", value: "is_empty" },
          { label: "Is Not Empty", value: "is_not_empty" },
          { label: "Exists", value: "exists" },
          { label: "Regex Match", value: "regex" },
        ],
      },
      { key: "rightValue", label: "Compare Against", type: "text", placeholder: "enterprise", description: "The value to compare against (not needed for Is Empty / Exists)" },
      { key: "caseSensitive", label: "Case Sensitive", type: "boolean", defaultValue: true, description: "Whether string comparisons are case-sensitive" },
    ],
    configSchema: z.object({
      leftPath: z.string().min(1),
      operator: z.enum(["equals", "not_equals", "contains", "gt", "lt", "gte", "lte", "is_empty", "is_not_empty", "exists", "regex"]),
      rightValue: z.any().optional(),
      caseSensitive: z.boolean().default(true),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ result: z.boolean(), payload: z.any().optional() }),
  },
  {
    id: "switch-case",
    version: "1.0.0",
    name: "Switch / Router",
    description: "Routes the workflow to different branches based on a value match.",
    icon: "GitBranch",
    category: "logic",
    tags: ["switch", "router", "branch", "multi-way"],
    configFields: [
      { key: "valuePath", label: "Value Path", type: "text", required: true, placeholder: "payload.type", description: "Dot-notation path to the value to match against" },
      { key: "cases", label: "Cases (JSON)", type: "json", required: true, rows: 5, defaultValue: [{ value: "typeA", label: "Type A" }, { value: "typeB", label: "Type B" }], description: "Array of { value, label } objects defining each branch" },
      { key: "defaultBranch", label: "Default Branch", type: "text", placeholder: "fallback", description: "Branch name when no cases match" },
    ],
    configSchema: z.object({
      valuePath: z.string().min(1),
      cases: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
      defaultBranch: z.string().optional(),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ matchedCase: z.string().optional(), payload: z.any() }),
  },
  {
    id: "loop",
    version: "1.0.0",
    name: "Loop / Iterator",
    description: "Iterates over an array and executes child steps for each item.",
    icon: "Repeat",
    category: "logic",
    tags: ["loop", "iterate", "foreach", "map"],
    configFields: [
      { key: "arrayPath", label: "Array Path", type: "text", required: true, placeholder: "payload.items", description: "Dot-notation path to the array to iterate over" },
      { key: "maxIterations", label: "Max Iterations", type: "number", defaultValue: 100, min: 1, max: 10000, description: "Safety limit to prevent infinite loops" },
      { key: "concurrency", label: "Concurrency", type: "number", defaultValue: 1, min: 1, max: 50, description: "Number of items to process in parallel" },
      { key: "continueOnError", label: "Continue on Error", type: "boolean", defaultValue: false, description: "Keep processing remaining items even if one fails" },
    ],
    configSchema: z.object({
      arrayPath: z.string().min(1),
      maxIterations: z.number().int().min(1).max(10000).default(100),
      concurrency: z.number().int().min(1).max(50).default(1),
      continueOnError: z.boolean().default(false),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ results: z.array(z.any()), totalProcessed: z.number() }),
  },

  // ─── AI ─────────────────────────────────────────────────────
  {
    id: "ai-agent",
    version: "1.0.0",
    name: "AI Agent",
    description: "Runs an LLM-powered agent to process, analyze, or generate content.",
    icon: "Brain",
    category: "ai",
    tags: ["ai", "llm", "gpt", "agent", "openai", "claude"],
    configFields: [
      {
        key: "provider",
        label: "AI Provider",
        type: "select",
        required: true,
        defaultValue: "openai",
        options: [
          { label: "OpenAI (GPT)", value: "openai" },
          { label: "Anthropic (Claude)", value: "anthropic" },
          { label: "Google (Gemini)", value: "google" },
          { label: "OpenRouter", value: "openrouter" },
          { label: "Custom / Self-hosted", value: "custom" },
        ],
      },
      {
        key: "model",
        label: "Model",
        type: "select",
        required: true,
        defaultValue: "gpt-4o-mini",
        description: "Which model to use for this agent",
        options: [
          { label: "GPT-4o", value: "gpt-4o" },
          { label: "GPT-4o Mini", value: "gpt-4o-mini" },
          { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
          { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
          { label: "Claude 3 Haiku", value: "claude-3-haiku-20240307" },
          { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
          { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
        ],
      },
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "sk-... or use {{secrets.OPENAI_KEY}}", description: "Provider API key (use secret references for safety)" },
      { key: "systemPrompt", label: "System Prompt", type: "textarea", required: true, rows: 5, placeholder: "You are a helpful assistant that summarizes customer feedback into actionable insights...", description: "Instructions that define the agent's role and behavior" },
      { key: "userPromptTemplate", label: "User Prompt Template", type: "textarea", required: true, rows: 4, placeholder: "Analyze the following feedback:\n\n{{payload.text}}\n\nProvide a summary and sentiment score.", description: "Template for the user message — {{variable}} syntax supported" },
      { key: "temperature", label: "Temperature", type: "number", defaultValue: 0.7, min: 0, max: 2, description: "Controls randomness (0 = deterministic, 2 = very creative)" },
      { key: "maxTokens", label: "Max Tokens", type: "number", defaultValue: 2048, min: 1, max: 128000, description: "Maximum response length in tokens" },
      { key: "responseFormat", label: "Response Format", type: "select", defaultValue: "text", options: [{ label: "Text", value: "text" }, { label: "JSON", value: "json" }], description: "Whether to request structured JSON output" },
    ],
    configSchema: z.object({
      provider: z.enum(["openai", "anthropic", "google", "openrouter", "custom"]).default("openai"),
      model: z.string().min(1),
      apiKey: z.string().min(1),
      systemPrompt: z.string().min(1),
      userPromptTemplate: z.string().min(1),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().int().min(1).max(128000).default(2048),
      responseFormat: z.enum(["text", "json"]).default("text"),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ content: z.string(), usage: z.object({ promptTokens: z.number(), completionTokens: z.number() }).optional() }),
  },
  {
    id: "text-transform",
    version: "1.0.0",
    name: "Text Transform",
    description: "Transforms text using templates, regex, or string operations.",
    icon: "FileText",
    category: "ai",
    tags: ["text", "transform", "template", "regex", "format"],
    configFields: [
      {
        key: "operation",
        label: "Operation",
        type: "select",
        required: true,
        defaultValue: "template",
        options: [
          { label: "Template Interpolation", value: "template" },
          { label: "Regex Replace", value: "regex" },
          { label: "Uppercase", value: "uppercase" },
          { label: "Lowercase", value: "lowercase" },
          { label: "Trim", value: "trim" },
          { label: "Split", value: "split" },
          { label: "Join", value: "join" },
        ],
      },
      { key: "inputPath", label: "Input Path", type: "text", required: true, placeholder: "payload.text", description: "Dot-notation path to the input text" },
      { key: "template", label: "Template / Pattern", type: "textarea", rows: 4, placeholder: "Hello {{payload.name}}, your order #{{payload.orderId}} is ready.", description: "Template string (for template op) or regex pattern (for regex op)" },
      { key: "replacement", label: "Replacement", type: "text", placeholder: "Replacement text", description: "Replacement string for regex operations" },
      { key: "separator", label: "Separator", type: "text", placeholder: ",", description: "Separator character for split/join operations" },
    ],
    configSchema: z.object({
      operation: z.enum(["template", "regex", "uppercase", "lowercase", "trim", "split", "join"]).default("template"),
      inputPath: z.string().min(1),
      template: z.string().optional(),
      replacement: z.string().optional(),
      separator: z.string().optional(),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ result: z.any() }),
  },

  // ─── CONTROL ────────────────────────────────────────────────
  {
    id: "delay",
    version: "1.0.0",
    name: "Delay / Wait",
    description: "Pauses workflow execution for a specified duration.",
    icon: "Clock",
    category: "control",
    tags: ["wait", "sleep", "delay", "pause", "timer"],
    configFields: [
      {
        key: "delayType",
        label: "Delay Type",
        type: "select",
        defaultValue: "fixed",
        options: [
          { label: "Fixed Duration", value: "fixed" },
          { label: "Until Specific Time", value: "until" },
        ],
      },
      { key: "durationMs", label: "Duration (ms)", type: "number", required: true, defaultValue: 5000, min: 100, max: 86400000, description: "Wait time in milliseconds (max 24 hours)" },
      { key: "untilTime", label: "Wait Until (ISO)", type: "text", placeholder: "2025-12-31T23:59:59Z", description: "ISO timestamp to wait until (for 'Until Specific Time' type)" },
    ],
    configSchema: z.object({
      delayType: z.enum(["fixed", "until"]).default("fixed"),
      durationMs: z.number().int().min(100).max(86400000).default(5000),
      untilTime: z.string().optional(),
    }),
    inputSchema: z.object({ payload: z.any().optional() }),
    outputSchema: z.object({ payload: z.any().optional(), delayedMs: z.number() }),
  },
  {
    id: "error-handler",
    version: "1.0.0",
    name: "Error Handler",
    description: "Catches and handles errors from upstream nodes with retry/fallback options.",
    icon: "AlertTriangle",
    category: "control",
    tags: ["error", "catch", "retry", "fallback", "exception"],
    configFields: [
      {
        key: "strategy",
        label: "Error Strategy",
        type: "select",
        required: true,
        defaultValue: "retry",
        options: [
          { label: "Retry", value: "retry" },
          { label: "Fallback Value", value: "fallback" },
          { label: "Skip & Continue", value: "skip" },
          { label: "Abort Workflow", value: "abort" },
        ],
      },
      { key: "maxRetries", label: "Max Retries", type: "number", defaultValue: 3, min: 0, max: 10, description: "Number of retry attempts (when strategy is Retry)" },
      { key: "retryDelayMs", label: "Retry Delay (ms)", type: "number", defaultValue: 1000, min: 100, max: 60000, description: "Delay between retry attempts" },
      { key: "backoffMultiplier", label: "Backoff Multiplier", type: "number", defaultValue: 2, min: 1, max: 10, description: "Multiplier for exponential backoff between retries" },
      { key: "fallbackValue", label: "Fallback Value (JSON)", type: "json", rows: 3, defaultValue: {}, description: "Value to use when strategy is Fallback" },
      { key: "notifyOnError", label: "Notify on Error", type: "boolean", defaultValue: false, description: "Send a notification when an error is caught" },
    ],
    configSchema: z.object({
      strategy: z.enum(["retry", "fallback", "skip", "abort"]).default("retry"),
      maxRetries: z.number().int().min(0).max(10).default(3),
      retryDelayMs: z.number().int().min(100).max(60000).default(1000),
      backoffMultiplier: z.number().min(1).max(10).default(2),
      fallbackValue: z.any().optional().default({}),
      notifyOnError: z.boolean().default(false),
    }),
    inputSchema: z.object({ error: z.any(), payload: z.any().optional() }),
    outputSchema: z.object({ handled: z.boolean(), result: z.any().optional() }),
  },
  {
    id: "approval",
    version: "1.0.0",
    name: "Manual Approval",
    description: "Pauses the workflow and waits for a human to approve or reject.",
    icon: "UserCheck",
    category: "control",
    tags: ["approval", "human", "manual", "review", "gate"],
    configFields: [
      { key: "approvers", label: "Approver Email(s)", type: "text", required: true, placeholder: "manager@company.com, lead@company.com", description: "Comma-separated list of users who can approve" },
      { key: "message", label: "Approval Message", type: "textarea", required: true, rows: 3, placeholder: "Please review the following order worth {{payload.total}}...", description: "Context message shown to the approver" },
      { key: "timeoutHours", label: "Timeout (hours)", type: "number", defaultValue: 24, min: 1, max: 720, description: "Auto-reject if no response within this time" },
      {
        key: "timeoutAction",
        label: "On Timeout",
        type: "select",
        defaultValue: "reject",
        options: [
          { label: "Auto-Reject", value: "reject" },
          { label: "Auto-Approve", value: "approve" },
          { label: "Abort Workflow", value: "abort" },
        ],
      },
      { key: "requireComment", label: "Require Comment", type: "boolean", defaultValue: false, description: "Force the approver to leave a comment" },
    ],
    configSchema: z.object({
      approvers: z.string().min(1),
      message: z.string().min(1),
      timeoutHours: z.number().int().min(1).max(720).default(24),
      timeoutAction: z.enum(["reject", "approve", "abort"]).default("reject"),
      requireComment: z.boolean().default(false),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ approved: z.boolean(), approver: z.string().optional(), comment: z.string().optional() }),
  },

  // ─── OUTPUT ─────────────────────────────────────────────────
  {
    id: "artifact-writer",
    version: "1.0.0",
    name: "Artifact Writer",
    description: "Stores execution output as a downloadable artifact.",
    icon: "Archive",
    category: "output",
    tags: ["storage", "artifact", "result", "output", "file"],
    configFields: [
      { key: "name", label: "Artifact Name", type: "text", required: true, placeholder: "run-summary.json", description: "File name for the stored artifact" },
      {
        key: "format",
        label: "Format",
        type: "select",
        required: true,
        defaultValue: "json",
        options: [
          { label: "JSON", value: "json" },
          { label: "Plain Text", value: "text" },
          { label: "Markdown", value: "markdown" },
          { label: "CSV", value: "csv" },
        ],
      },
      { key: "contentPath", label: "Content Path", type: "text", placeholder: "payload.report", description: "Dot-path to the data to store (defaults to entire payload)" },
      { key: "public", label: "Public Artifact", type: "boolean", defaultValue: false, description: "Make the artifact downloadable via a public URL" },
    ],
    configSchema: z.object({
      name: z.string().min(1),
      format: z.enum(["json", "text", "markdown", "csv"]).default("json"),
      contentPath: z.string().optional(),
      public: z.boolean().default(false),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ artifactId: z.string(), url: z.string().optional(), size: z.number().optional() }),
  },
  {
    id: "webhook-response",
    version: "1.0.0",
    name: "Webhook Response",
    description: "Sends a response back to the original webhook caller.",
    icon: "Send",
    category: "output",
    tags: ["response", "webhook", "reply", "return"],
    configFields: [
      { key: "statusCode", label: "Status Code", type: "number", required: true, defaultValue: 200, min: 100, max: 599, description: "HTTP status code to return" },
      { key: "headers", label: "Response Headers (JSON)", type: "json", rows: 2, defaultValue: { "Content-Type": "application/json" }, description: "Custom response headers" },
      { key: "bodyTemplate", label: "Response Body Template", type: "textarea", rows: 5, placeholder: "{ \"status\": \"success\", \"data\": {{payload}} }", description: "Response body — use {{variable}} for dynamic values" },
    ],
    configSchema: z.object({
      statusCode: z.number().int().min(100).max(599).default(200),
      headers: JsonRecordSchema.optional().default({ "Content-Type": "application/json" }),
      bodyTemplate: z.string().optional(),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ sent: z.boolean() }),
  },
];

const ComponentMap = new Map(Components.map((c) => [c.id, c]));

const PublicComponentSchema = z.object({
  id: z.string(),
  version: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  configFields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.string(),
      description: z.string().optional(),
      required: z.boolean().optional(),
      placeholder: z.string().optional(),
      defaultValue: z.any().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      rows: z.number().optional(),
      options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    }),
  ),
});

const NodePayloadSchema = z.object({
  componentId: z.string().min(1),
  config: z.record(z.any()).default({}),
});

function toPublicComponent(component: WorkflowComponentDefinition) {
  return {
    id: component.id,
    version: component.version,
    name: component.name,
    description: component.description,
    icon: component.icon,
    category: component.category,
    tags: component.tags,
    configFields: component.configFields,
  };
}

export function getComponentCatalog() {
  return Components.map(toPublicComponent);
}

export function getComponentById(componentId: string) {
  return ComponentMap.get(componentId) ?? null;
}

export function validateNodeConfig(componentId: string, config: unknown) {
  const component = getComponentById(componentId);

  if (!component) {
    return {
      ok: false as const,
      errors: [{ path: "componentId", message: `Unknown component: "${componentId}"` }],
    };
  }

  const parsed = component.configSchema.safeParse(config ?? {});
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return {
    ok: true as const,
    value: parsed.data,
  };
}

export function validateWorkflowNodes(
  nodes: Array<{ id?: string; nodeType?: string; componentId?: string; config?: unknown }>,
) {
  const errors: Array<{ nodeId: string; componentId: string; path: string; message: string }> = [];
  const normalized: Array<{
    id: string;
    componentId: string;
    nodeType: string;
    config: Record<string, unknown>;
  }> = [];

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const nodeId = node.id || `node-${i + 1}`;
    const componentId = (node.componentId || node.nodeType || "").trim();

    if (!componentId) {
      errors.push({
        nodeId,
        componentId: "",
        path: "componentId",
        message: "componentId (or nodeType) is required",
      });
      continue;
    }

    const result = validateNodeConfig(componentId, node.config ?? {});
    if (!result.ok) {
      for (const e of result.errors) {
        errors.push({
          nodeId,
          componentId,
          path: e.path,
          message: e.message,
        });
      }
      continue;
    }

    normalized.push({
      id: nodeId,
      componentId,
      nodeType: componentId,
      config: (result.value ?? {}) as Record<string, unknown>,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized,
  };
}

componentCatalogRouter.get("/", (_, res) => {
  const payload = getComponentCatalog();

  const validated = z.array(PublicComponentSchema).safeParse(payload);
  if (!validated.success) {
    return res.status(500).json({
      error: "Invalid catalog payload",
      details: validated.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  return res.json(validated.data);
});

componentCatalogRouter.get("/:componentId", (req, res) => {
  const component = getComponentById(req.params.componentId);

  if (!component) {
    return res.status(404).json({ error: "Component not found" });
  }

  const publicComponent = toPublicComponent(component);
  const parsed = PublicComponentSchema.safeParse(publicComponent);

  if (!parsed.success) {
    return res.status(500).json({
      error: "Invalid component payload",
      details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  return res.json(parsed.data);
});

componentCatalogRouter.post("/validate-node-config", (req, res) => {
  const parsed = NodePayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const result = validateNodeConfig(parsed.data.componentId, parsed.data.config);

  if (!result.ok) {
    return res.status(422).json({
      ok: false,
      errors: result.errors,
    });
  }

  return res.json({
    ok: true,
    normalizedConfig: result.value,
  });
});
