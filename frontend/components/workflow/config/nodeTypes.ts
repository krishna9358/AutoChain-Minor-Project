import {
  Zap,
  Globe,
  Mail,
  Database,
  GitFork,
  GitBranch,
  RefreshCw,
  Brain,
  FileText,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Archive,
  Send,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { SlackLogo } from "../icons/ServiceLogos";

export type NodeCategory =
  | "input"
  | "integration"
  | "ai"
  | "logic"
  | "control"
  | "output";

export interface NodeTypeConfig {
  id: string;
  name: string;
  category: NodeCategory;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  requiresConfig: boolean;
  exampleWorkflows?: string[];
}

export const NODE_CATEGORIES: Record<
  NodeCategory,
  {
    name: string;
    description: string;
    color: string;
    bgColor: string;
  }
> = {
  input: {
    name: "Input",
    description: "Start your workflow",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
  },
  integration: {
    name: "Integration",
    description: "Connect to external services",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
  },
  ai: {
    name: "AI",
    description: "Intelligent processing",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
  },
  logic: {
    name: "Logic",
    description: "Control flow",
    color: "#10b981",
    bgColor: "bg-emerald-50",
  },
  control: {
    name: "Control",
    description: "Manage execution",
    color: "#6b7280",
    bgColor: "bg-gray-50",
  },
  output: {
    name: "Output",
    description: "Workflow output",
    color: "#6366f1",
    bgColor: "bg-indigo-50",
  },
};

export const NODE_TYPES: Record<string, NodeTypeConfig> = {
  // Input
  "entry-point": {
    id: "entry-point",
    name: "Entry Point",
    category: "input",
    icon: Zap,
    description: "Starts a workflow via webhook, API call, schedule, or manual trigger.",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-400",
    requiresConfig: true,
    exampleWorkflows: ["Meeting Intelligence", "Customer Support", "Sales Outreach", "Incident Management"],
  },

  // Integration
  "http-request": {
    id: "http-request",
    name: "HTTP Request",
    category: "integration",
    icon: Globe,
    description: "Performs an outbound HTTP request to an external API or service.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Sales Outreach", "API Integrations"],
  },
  "slack-send": {
    id: "slack-send",
    name: "Slack Message",
    category: "integration",
    icon: SlackLogo,
    description: "Sends a message to a Slack channel or user via webhook or Bot API.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Meeting Intelligence", "Incident Management"],
  },
  "email-send": {
    id: "email-send",
    name: "Send Email",
    category: "integration",
    icon: Mail,
    description: "Sends an email via SMTP or an email service provider.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Customer Support", "Sales Outreach"],
  },
  "db-query": {
    id: "db-query",
    name: "Database Query",
    category: "integration",
    icon: Database,
    description: "Executes a SQL query or database operation against a connected database.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Data Processing", "Reporting"],
  },

  // Logic
  "if-condition": {
    id: "if-condition",
    name: "If / Else",
    category: "logic",
    icon: GitFork,
    description: "Branches the workflow based on a condition expression.",
    color: "#10b981",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400",
    requiresConfig: true,
    exampleWorkflows: ["Conditional Workflows", "Routing"],
  },
  "switch-case": {
    id: "switch-case",
    name: "Switch / Router",
    category: "logic",
    icon: GitBranch,
    description: "Routes the workflow to different branches based on a value match.",
    color: "#10b981",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400",
    requiresConfig: true,
    exampleWorkflows: ["Multi-path Routing", "Case Handling"],
  },
  loop: {
    id: "loop",
    name: "Loop / Iterator",
    category: "logic",
    icon: RefreshCw,
    description: "Iterates over an array and executes child steps for each item.",
    color: "#10b981",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400",
    requiresConfig: true,
    exampleWorkflows: ["Batch Processing", "List Operations"],
  },

  // AI
  "ai-agent": {
    id: "ai-agent",
    name: "AI Agent",
    category: "ai",
    icon: Brain,
    description: "Runs an LLM-powered agent to process, analyze, or generate content.",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Meeting Intelligence", "Customer Support", "Sales Outreach", "Incident Management"],
  },
  "text-transform": {
    id: "text-transform",
    name: "Text Transform",
    category: "ai",
    icon: FileText,
    description: "Transforms text using templates, regex, or string operations.",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Data Processing", "Content Formatting"],
  },

  // Control
  delay: {
    id: "delay",
    name: "Delay / Wait",
    category: "control",
    icon: Clock,
    description: "Pauses workflow execution for a specified duration.",
    color: "#6b7280",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-400",
    requiresConfig: true,
    exampleWorkflows: ["Rate Limiting", "Scheduled Follow-ups"],
  },
  "error-handler": {
    id: "error-handler",
    name: "Error Handler",
    category: "control",
    icon: ShieldAlert,
    description: "Catches and handles errors from upstream nodes with retry/fallback options.",
    color: "#6b7280",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-400",
    requiresConfig: true,
    exampleWorkflows: ["Resilient Workflows", "Error Recovery"],
  },
  approval: {
    id: "approval",
    name: "Manual Approval",
    category: "control",
    icon: CheckCircle2,
    description: "Pauses the workflow and waits for a human to approve or reject.",
    color: "#6b7280",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-400",
    requiresConfig: true,
    exampleWorkflows: ["Meeting Intelligence", "Customer Support"],
  },

  // Output
  "artifact-writer": {
    id: "artifact-writer",
    name: "Artifact Writer",
    category: "output",
    icon: Archive,
    description: "Stores execution output as a downloadable artifact.",
    color: "#6366f1",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-400",
    requiresConfig: true,
    exampleWorkflows: ["Incident Management", "Reporting"],
  },
  "webhook-response": {
    id: "webhook-response",
    name: "Webhook Response",
    category: "output",
    icon: Send,
    description: "Sends a response back to the original webhook caller.",
    color: "#6366f1",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-400",
    requiresConfig: true,
    exampleWorkflows: ["API Integrations", "Webhook Workflows"],
  },
};

export const getNodesByCategory = (
  category: NodeCategory,
): NodeTypeConfig[] => {
  return Object.values(NODE_TYPES).filter((node) => node.category === category);
};

export const getNodeById = (id: string): NodeTypeConfig | undefined => {
  return NODE_TYPES[id];
};

export const getAllNodeTypes = (): NodeTypeConfig[] => {
  return Object.values(NODE_TYPES);
};

// Config field types
export type ConfigFieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "boolean"
  | "password"
  | "json"
  | "api-key"
  | "email"
  | "url"
  | "multi-select"
  | "code";

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  description?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  rows?: number;
  /** Show this field only when another field has a specific value */
  showWhen?: { field: string; value: string | string[] };
}

// Component-specific config schemas (mirroring backend componentCatalog configFields)
export const NODE_CONFIG_SCHEMA: Record<string, ConfigField[]> = {
  // Entry Point
  "entry-point": [
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
      description: "URL path for incoming webhook requests",
      showWhen: { field: "triggerMode", value: "webhook" },
    },
    {
      key: "cron",
      label: "Cron Expression",
      type: "text",
      placeholder: "0 */6 * * *",
      description: "Cron schedule expression",
      showWhen: { field: "triggerMode", value: "schedule" },
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

  // HTTP Request
  "http-request": [
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
    {
      key: "url",
      label: "Request URL",
      type: "url",
      required: true,
      placeholder: "https://api.example.com/v1/items",
      description: "Full URL including protocol",
    },
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
    {
      key: "authValue",
      label: "Auth Token / Key",
      type: "password",
      placeholder: "Enter token or use {{secrets.MY_KEY}}",
      description: "Authentication credential (supports secret references)",
      showWhen: { field: "authType", value: ["bearer", "api-key", "basic"] },
    },
    {
      key: "headers",
      label: "Headers (JSON)",
      type: "json",
      rows: 3,
      defaultValue: {},
      description: "Custom request headers as key-value pairs",
    },
    {
      key: "query",
      label: "Query Parameters (JSON)",
      type: "json",
      rows: 3,
      defaultValue: {},
      description: "URL query parameters as key-value pairs",
    },
    {
      key: "body",
      label: "Request Body (JSON)",
      type: "json",
      rows: 5,
      defaultValue: {},
      description: "Request body payload (for POST/PUT/PATCH)",
    },
    {
      key: "timeoutMs",
      label: "Timeout (ms)",
      type: "number",
      defaultValue: 15000,
      min: 1000,
      max: 120000,
      description: "Max time to wait for a response",
    },
    {
      key: "retryCount",
      label: "Retry Count",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 10,
      description: "Number of retries on failure",
    },
  ],

  // Slack Message
  "slack-send": [
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
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "url",
      placeholder: "https://hooks.slack.com/services/...",
      description: "Slack incoming webhook URL",
      showWhen: { field: "mode", value: "webhook" },
    },
    {
      key: "botToken",
      label: "Bot Token",
      type: "password",
      placeholder: "xoxb-...",
      description: "Slack Bot token",
      showWhen: { field: "mode", value: "bot" },
    },
    {
      key: "channel",
      label: "Channel",
      type: "text",
      required: true,
      placeholder: "#general",
      description: "Channel name (e.g. #general) or user ID",
    },
    {
      key: "message",
      label: "Message",
      type: "textarea",
      required: true,
      rows: 4,
      placeholder: "Hello from AutoChain! Status: {{payload.status}}",
      description: "Message text — supports {{variable}} template syntax",
    },
    {
      key: "username",
      label: "Bot Username",
      type: "text",
      placeholder: "AutoChain Bot",
      description: "Display name for the bot message",
    },
    {
      key: "iconEmoji",
      label: "Icon Emoji",
      type: "text",
      placeholder: ":robot_face:",
      description: "Emoji to use as the bot avatar",
    },
  ],

  // Send Email
  "email-send": [
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
    {
      key: "apiKey",
      label: "API Key / Password",
      type: "password",
      placeholder: "Enter API key or use {{secrets.EMAIL_KEY}}",
      description: "Service API key or SMTP password",
    },
    {
      key: "smtpHost",
      label: "SMTP Host",
      type: "text",
      placeholder: "smtp.gmail.com",
      description: "SMTP server hostname",
      showWhen: { field: "provider", value: "smtp" },
    },
    {
      key: "smtpPort",
      label: "SMTP Port",
      type: "number",
      defaultValue: 587,
      min: 1,
      max: 65535,
      description: "SMTP server port",
      showWhen: { field: "provider", value: "smtp" },
    },
    {
      key: "from",
      label: "From Address",
      type: "email",
      required: true,
      placeholder: "noreply@yourcompany.com",
    },
    {
      key: "to",
      label: "To Address(es)",
      type: "text",
      required: true,
      placeholder: "user@example.com, admin@example.com",
      description: "Comma-separated email addresses",
    },
    {
      key: "subject",
      label: "Subject",
      type: "text",
      required: true,
      placeholder: "Workflow Report — {{payload.date}}",
      description: "Email subject line — supports {{variable}} syntax",
    },
    {
      key: "body",
      label: "Email Body",
      type: "textarea",
      required: true,
      rows: 6,
      placeholder: "Hi {{payload.name}},\n\nYour report is ready.\n\nBest,\nAutoChain",
      description: "Email body content — supports {{variable}} syntax",
    },
    {
      key: "isHtml",
      label: "Send as HTML",
      type: "boolean",
      defaultValue: false,
      description: "Treat the body as HTML instead of plain text",
    },
  ],

  // Database Query
  "db-query": [
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
    {
      key: "connectionString",
      label: "Connection String",
      type: "password",
      required: true,
      placeholder: "postgresql://user:pass@host:5432/db",
      description: "Database connection URL (use {{secrets.DB_URL}} for security)",
    },
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
    {
      key: "query",
      label: "SQL Query",
      type: "textarea",
      required: true,
      rows: 5,
      placeholder: "SELECT * FROM users WHERE status = $1",
      description: "SQL query with $1, $2 parameter placeholders",
    },
    {
      key: "params",
      label: "Query Parameters (JSON)",
      type: "json",
      rows: 2,
      defaultValue: [],
      description: "Array of parameter values for the query placeholders",
    },
    {
      key: "timeout",
      label: "Query Timeout (ms)",
      type: "number",
      defaultValue: 30000,
      min: 1000,
      max: 300000,
    },
  ],

  // If / Else
  "if-condition": [
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
    {
      key: "rightValue",
      label: "Compare Against",
      type: "text",
      placeholder: "enterprise",
      description: "The value to compare against (not needed for Is Empty / Exists)",
    },
    {
      key: "caseSensitive",
      label: "Case Sensitive",
      type: "boolean",
      defaultValue: true,
      description: "Whether string comparisons are case-sensitive",
    },
  ],

  // Switch / Router
  "switch-case": [
    {
      key: "valuePath",
      label: "Value Path",
      type: "text",
      required: true,
      placeholder: "payload.type",
      description: "Dot-notation path to the value to match against",
    },
    {
      key: "cases",
      label: "Cases (JSON)",
      type: "json",
      required: true,
      rows: 5,
      defaultValue: [{ value: "typeA", label: "Type A" }, { value: "typeB", label: "Type B" }],
      description: "Array of { value, label } objects defining each branch",
    },
    {
      key: "defaultBranch",
      label: "Default Branch",
      type: "text",
      placeholder: "fallback",
      description: "Branch name when no cases match",
    },
  ],

  // Loop / Iterator
  loop: [
    {
      key: "arrayPath",
      label: "Array Path",
      type: "text",
      required: true,
      placeholder: "payload.items",
      description: "Dot-notation path to the array to iterate over",
    },
    {
      key: "maxIterations",
      label: "Max Iterations",
      type: "number",
      defaultValue: 100,
      min: 1,
      max: 10000,
      description: "Safety limit to prevent infinite loops",
    },
    {
      key: "concurrency",
      label: "Concurrency",
      type: "number",
      defaultValue: 1,
      min: 1,
      max: 50,
      description: "Number of items to process in parallel",
    },
    {
      key: "continueOnError",
      label: "Continue on Error",
      type: "boolean",
      defaultValue: false,
      description: "Keep processing remaining items even if one fails",
    },
  ],

  // AI Agent
  "ai-agent": [
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
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "sk-... or use {{secrets.OPENAI_KEY}}",
      description: "Provider API key (use secret references for safety)",
    },
    {
      key: "systemPrompt",
      label: "System Prompt",
      type: "textarea",
      required: true,
      rows: 5,
      placeholder: "You are a helpful assistant that summarizes customer feedback into actionable insights...",
      description: "Instructions that define the agent's role and behavior",
    },
    {
      key: "userPromptTemplate",
      label: "User Prompt Template",
      type: "textarea",
      required: true,
      rows: 4,
      placeholder: "Analyze the following feedback:\n\n{{payload.text}}\n\nProvide a summary and sentiment score.",
      description: "Template for the user message — {{variable}} syntax supported",
    },
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      defaultValue: 0.7,
      min: 0,
      max: 2,
      description: "Controls randomness (0 = deterministic, 2 = very creative)",
    },
    {
      key: "maxTokens",
      label: "Max Tokens",
      type: "number",
      defaultValue: 2048,
      min: 1,
      max: 128000,
      description: "Maximum response length in tokens",
    },
    {
      key: "responseFormat",
      label: "Response Format",
      type: "select",
      defaultValue: "text",
      options: [
        { label: "Text", value: "text" },
        { label: "JSON", value: "json" },
      ],
      description: "Whether to request structured JSON output",
    },
  ],

  // Text Transform
  "text-transform": [
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
    {
      key: "inputPath",
      label: "Input Path",
      type: "text",
      required: true,
      placeholder: "payload.text",
      description: "Dot-notation path to the input text",
    },
    {
      key: "template",
      label: "Template / Pattern",
      type: "textarea",
      rows: 4,
      placeholder: "Hello {{payload.name}}, your order #{{payload.orderId}} is ready.",
      description: "Template string (for template op) or regex pattern (for regex op)",
    },
    {
      key: "replacement",
      label: "Replacement",
      type: "text",
      placeholder: "Replacement text",
      description: "Replacement string for regex operations",
      showWhen: { field: "operation", value: "regex" },
    },
    {
      key: "separator",
      label: "Separator",
      type: "text",
      placeholder: ",",
      description: "Separator character for split/join operations",
      showWhen: { field: "operation", value: ["split", "join"] },
    },
  ],

  // Delay / Wait
  delay: [
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
    {
      key: "durationMs",
      label: "Duration (ms)",
      type: "number",
      required: true,
      defaultValue: 5000,
      min: 100,
      max: 86400000,
      description: "Wait time in milliseconds (max 24 hours)",
      showWhen: { field: "delayType", value: "fixed" },
    },
    {
      key: "untilTime",
      label: "Wait Until (ISO)",
      type: "text",
      placeholder: "2025-12-31T23:59:59Z",
      description: "ISO timestamp to wait until",
      showWhen: { field: "delayType", value: "until" },
    },
  ],

  // Error Handler
  "error-handler": [
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
    {
      key: "maxRetries",
      label: "Max Retries",
      type: "number",
      defaultValue: 3,
      min: 0,
      max: 10,
      description: "Number of retry attempts",
      showWhen: { field: "strategy", value: "retry" },
    },
    {
      key: "retryDelayMs",
      label: "Retry Delay (ms)",
      type: "number",
      defaultValue: 1000,
      min: 100,
      max: 60000,
      description: "Delay between retry attempts",
      showWhen: { field: "strategy", value: "retry" },
    },
    {
      key: "backoffMultiplier",
      label: "Backoff Multiplier",
      type: "number",
      defaultValue: 2,
      min: 1,
      max: 10,
      description: "Multiplier for exponential backoff between retries",
      showWhen: { field: "strategy", value: "retry" },
    },
    {
      key: "fallbackValue",
      label: "Fallback Value (JSON)",
      type: "json",
      rows: 3,
      defaultValue: {},
      description: "Value to use when strategy is Fallback",
      showWhen: { field: "strategy", value: "fallback" },
    },
    {
      key: "notifyOnError",
      label: "Notify on Error",
      type: "boolean",
      defaultValue: false,
      description: "Send a notification when an error is caught",
    },
  ],

  // Manual Approval
  approval: [
    {
      key: "approvers",
      label: "Approver Email(s)",
      type: "text",
      required: true,
      placeholder: "manager@company.com, lead@company.com",
      description: "Comma-separated list of users who can approve",
    },
    {
      key: "message",
      label: "Approval Message",
      type: "textarea",
      required: true,
      rows: 3,
      placeholder: "Please review the following order worth {{payload.total}}...",
      description: "Context message shown to the approver",
    },
    {
      key: "timeoutHours",
      label: "Timeout (hours)",
      type: "number",
      defaultValue: 24,
      min: 1,
      max: 720,
      description: "Auto-reject if no response within this time",
    },
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
    {
      key: "requireComment",
      label: "Require Comment",
      type: "boolean",
      defaultValue: false,
      description: "Force the approver to leave a comment",
    },
  ],

  // Artifact Writer
  "artifact-writer": [
    {
      key: "name",
      label: "Artifact Name",
      type: "text",
      required: true,
      placeholder: "run-summary.json",
      description: "File name for the stored artifact",
    },
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
    {
      key: "contentPath",
      label: "Content Path",
      type: "text",
      placeholder: "payload.report",
      description: "Dot-path to the data to store (defaults to entire payload)",
    },
    {
      key: "public",
      label: "Public Artifact",
      type: "boolean",
      defaultValue: false,
      description: "Make the artifact downloadable via a public URL",
    },
  ],

  // Webhook Response
  "webhook-response": [
    {
      key: "statusCode",
      label: "Status Code",
      type: "number",
      required: true,
      defaultValue: 200,
      min: 100,
      max: 599,
      description: "HTTP status code to return",
    },
    {
      key: "headers",
      label: "Response Headers (JSON)",
      type: "json",
      rows: 2,
      defaultValue: { "Content-Type": "application/json" },
      description: "Custom response headers",
    },
    {
      key: "bodyTemplate",
      label: "Response Body Template",
      type: "textarea",
      rows: 5,
      placeholder: '{ "status": "success", "data": {{payload}} }',
      description: "Response body — use {{variable}} for dynamic values",
    },
  ],
};

// Helper function to get config fields for a node type
export const getConfigFields = (nodeType: string): ConfigField[] => {
  return NODE_CONFIG_SCHEMA[nodeType] || [];
};

// Helper function to check if a node type requires config
export const requiresConfig = (nodeType: string): boolean => {
  const fields = getConfigFields(nodeType);
  return fields.length > 0;
};

// Example workflow templates
export const WORKFLOW_TEMPLATES = [
  {
    id: "meeting-intelligence",
    name: "Meeting Intelligence",
    description: "Automate meeting notes and task assignment",
    icon: Brain,
    steps: [
      "Trigger on meeting transcript",
      "Extract tasks using AI",
      "Assign owners using contextual analysis",
      "Notify via Slack",
      "Manual approval gate",
    ],
    nodes: [
      "entry-point",
      "ai-agent",
      "ai-agent",
      "slack-send",
      "approval",
    ],
  },
  {
    id: "customer-support",
    name: "Customer Support Automation",
    description: "Automate ticket classification and response",
    icon: MessageSquare,
    steps: [
      "Trigger when new ticket created",
      "Classify issue type with AI",
      "Draft response with AI",
      "Human approval",
      "Send email to customer",
    ],
    nodes: [
      "entry-point",
      "ai-agent",
      "ai-agent",
      "approval",
      "email-send",
    ],
  },
  {
    id: "sales-outreach",
    name: "Sales Outreach",
    description: "Automate lead qualification and email campaigns",
    icon: Mail,
    steps: [
      "Trigger when new lead added",
      "Fetch company data via HTTP",
      "Score lead quality with AI",
      "Generate personalized email with AI",
      "Send email",
    ],
    nodes: [
      "entry-point",
      "http-request",
      "ai-agent",
      "ai-agent",
      "email-send",
    ],
  },
  {
    id: "incident-management",
    name: "Incident Management",
    description: "Automate alert handling and escalation",
    icon: ShieldCheck,
    steps: [
      "Trigger when system alert received",
      "Analyze logs with AI",
      "Determine severity with AI",
      "Notify DevOps via Slack",
      "Store incident report",
    ],
    nodes: [
      "entry-point",
      "ai-agent",
      "ai-agent",
      "slack-send",
      "artifact-writer",
    ],
  },
];
