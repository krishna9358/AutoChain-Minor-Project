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
  Github,
  Calendar,
  Video,
  Table2,
  Timer,
  AlertTriangle,
  Users,
  Search,
  FileOutput,
  ClipboardList,
  Bot,
  Wrench,
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
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
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
    description: "How your workflow gets started",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
  },
  integration: {
    name: "Integration",
    description: "Connect to apps and services like Slack, Email, and Google",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
  },
  ai: {
    name: "AI",
    description: "Use artificial intelligence to analyze, decide, and create",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
  },
  logic: {
    name: "Logic",
    description: "Add decisions, routing, and loops to your workflow",
    color: "#10b981",
    bgColor: "bg-emerald-50",
  },
  control: {
    name: "Control",
    description: "Manage timing, approvals, tasks, and error handling",
    color: "#6b7280",
    bgColor: "bg-gray-50",
  },
  output: {
    name: "Output",
    description: "Save results, generate documents, and record activity",
    color: "#6366f1",
    bgColor: "bg-indigo-50",
  },
};

export const NODE_TYPES: Record<string, NodeTypeConfig> = {
  // Input
  "entry-point": {
    id: "entry-point",
    name: "Start Trigger",
    category: "input",
    icon: Zap,
    description:
      "The starting point of your workflow — choose how it gets kicked off (manually, on a schedule, or when data arrives).",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-400",
    requiresConfig: true,
    exampleWorkflows: [
      "Meeting Intelligence",
      "Customer Support",
      "Sales Outreach",
      "Incident Management",
    ],
  },

  // Integration
  "http-request": {
    id: "http-request",
    name: "API Call",
    category: "integration",
    icon: Globe,
    description:
      "Connects to any external service or website to send or fetch data.",
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
    description:
      "Sends a message to a Slack channel or person to keep your team informed.",
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
    description: "Sends an email to one or more people with customizable content.",
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
    description:
      "Reads or writes data in your database — great for looking up records or saving results.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Data Processing", "Reporting"],
  },
  github: {
    id: "github",
    name: "GitHub",
    category: "integration",
    icon: Github,
    description:
      "Works with GitHub — view repos, list issues, manage pull requests, or create new issues.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["DevOps", "Issue triage", "Release automation"],
  },
  "google-calendar": {
    id: "google-calendar",
    name: "Google Calendar",
    category: "integration",
    icon: Calendar,
    description:
      "Manages your Google Calendar — create, update, or view events automatically.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Scheduling", "Reminders", "Team ops"],
  },
  "google-meet": {
    id: "google-meet",
    name: "Google Meet",
    category: "integration",
    icon: Video,
    description:
      "Creates Google Meet video calls and adds them to calendar events automatically.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Video calls", "Interviews", "Standups"],
  },
  "google-docs": {
    id: "google-docs",
    name: "Google Docs",
    category: "integration",
    icon: FileText,
    description:
      "Reads, creates, or updates Google Docs — perfect for generating reports or notes.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Reports", "Contracts", "Notes"],
  },
  "google-sheets": {
    id: "google-sheets",
    name: "Google Sheets",
    category: "integration",
    icon: Table2,
    description:
      "Reads or updates Google Sheets — ideal for tracking data, logs, or dashboards.",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Reporting", "ETL", "Dashboards"],
  },

  // Logic
  "if-condition": {
    id: "if-condition",
    name: "If / Else",
    category: "logic",
    icon: GitFork,
    description: "Makes a yes/no decision and sends the workflow down different paths based on the answer.",
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
    description:
      "Routes the workflow to different paths — like a traffic controller for your data.",
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
    description:
      "Repeats a set of steps for each item in a list — process many items automatically.",
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
    description:
      "Uses AI to think, analyze, write, or make decisions — the brain of your workflow.",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: [
      "Meeting Intelligence",
      "Customer Support",
      "Sales Outreach",
      "Incident Management",
    ],
  },
  "text-transform": {
    id: "text-transform",
    name: "Text Transform",
    category: "ai",
    icon: FileText,
    description:
      "Formats, cleans, or transforms text — merge templates, find patterns, or reshape data.",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Data Processing", "Content Formatting"],
  },
  "chat-model": {
    id: "chat-model",
    name: "Chat Model",
    category: "ai",
    icon: RefreshCw,
    description:
      "LLM provider configuration — connects to an AI Agent to supply the chat model (OpenAI, Anthropic, Google, etc.).",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Meeting Intelligence", "Customer Support"],
  },
  "agent-memory": {
    id: "agent-memory",
    name: "Memory",
    category: "ai",
    icon: Database,
    description:
      "Gives an AI Agent memory — conversation history, vector store, or key-value memory for context retention.",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Customer Support", "Sales Outreach"],
  },
  "agent-tool": {
    id: "agent-tool",
    name: "Tool",
    category: "ai",
    icon: Wrench,
    description:
      "External tool for an AI Agent — HTTP requests, code execution, calculators, database queries, and more.",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Meeting Intelligence", "Incident Management"],
  },

  // Control
  delay: {
    id: "delay",
    name: "Delay / Wait",
    category: "control",
    icon: Clock,
    description: "Pauses the workflow for a set amount of time before continuing to the next step.",
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
    description:
      "Catches problems and recovers gracefully — retry the step, use a backup plan, or alert someone.",
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
    description:
      "Pauses the workflow and waits for a person to review and approve before continuing.",
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
    description: "Saves the workflow output as a file you can download or reference later.",
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
    description: "Sends a response back to the system that triggered this workflow.",
    color: "#6366f1",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-400",
    requiresConfig: true,
    exampleWorkflows: ["API Integrations", "Webhook Workflows"],
  },

  // ─── Enterprise Nodes ────────────────────────────────────────
  "sla-monitor": {
    id: "sla-monitor",
    name: "SLA Monitor",
    category: "control",
    icon: Timer,
    description:
      "Tracks deadlines and alerts your team before a Service Level Agreement is missed.",
    color: "#ef4444",
    bgColor: "bg-red-50",
    borderColor: "border-red-400",
    requiresConfig: true,
    exampleWorkflows: ["Workflow Health Monitor", "Incident Management"],
  },
  "audit-log": {
    id: "audit-log",
    name: "Audit Log",
    category: "output",
    icon: ClipboardList,
    description:
      "Records every decision and action for compliance and easy review later.",
    color: "#6366f1",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-400",
    requiresConfig: true,
    exampleWorkflows: ["Contract Lifecycle", "Procurement"],
  },
  "task-assigner": {
    id: "task-assigner",
    name: "Task Assigner",
    category: "control",
    icon: Users,
    description:
      "Automatically assigns tasks to the right team members with clear deadlines.",
    color: "#6b7280",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-400",
    requiresConfig: true,
    exampleWorkflows: ["Employee Onboarding", "Meeting Intelligence"],
  },
  escalation: {
    id: "escalation",
    name: "Escalation",
    category: "control",
    icon: AlertTriangle,
    description:
      "Sends an alert to a manager or senior team member when something needs attention.",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-400",
    requiresConfig: true,
    exampleWorkflows: ["Incident Management", "Workflow Health Monitor"],
  },
  "data-enrichment": {
    id: "data-enrichment",
    name: "Data Enrichment",
    category: "ai",
    icon: Search,
    description:
      "Pulls extra information from other systems to fill in missing details automatically.",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Sales Outreach", "Employee Onboarding"],
  },
  "document-generator": {
    id: "document-generator",
    name: "Document Generator",
    category: "output",
    icon: FileOutput,
    description:
      "Creates reports, contracts, or summaries from your workflow data.",
    color: "#6366f1",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-400",
    requiresConfig: true,
    exampleWorkflows: ["Contract Lifecycle", "Procurement"],
  },
  "form-input": {
    id: "form-input",
    name: "Form Input",
    category: "input",
    icon: ClipboardList,
    description:
      "Collects information from a person through a simple form before continuing.",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-400",
    requiresConfig: true,
    exampleWorkflows: ["Employee Onboarding", "Procurement"],
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
  | "code"
  | "google-account"
  | "datetime";

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
  /** Datetime-specific: Show seconds in time picker */
  showSeconds?: boolean;
  /** Datetime-specific: Use 12-hour format (AM/PM) instead of 24-hour */
  hour12?: boolean;
  /** Datetime-specific: Minimum allowed date (ISO 8601 format) */
  minDate?: string;
  /** Datetime-specific: Maximum allowed date (ISO 8601 format) */
  maxDate?: string;
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
    {
      key: "testRunPlainText",
      label: "Test run input (plain text)",
      type: "textarea",
      rows: 5,
      placeholder: "e.g. sample input data — no JSON required",
      description:
        "Used when you click Run in the editor: sent as triggerData.text. Webhooks and the API can still send any JSON as triggerData.",
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
      placeholder:
        "Hi {{payload.name}},\n\nYour report is ready.\n\nBest,\nAutoChain",
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
      description:
        "Database connection URL (use {{secrets.DB_URL}} for security)",
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

  // GitHub
  github: [
    {
      key: "personalAccessToken",
      label: "Personal Access Token",
      type: "password",
      placeholder: "ghp_… or {{secrets.GITHUB_TOKEN}}",
      description:
        "Optional for public repo reads; required for private repos and create issue.",
    },
    {
      key: "owner",
      label: "Owner / Organization",
      type: "text",
      required: true,
      placeholder: "octocat",
    },
    {
      key: "repo",
      label: "Repository",
      type: "text",
      required: true,
      placeholder: "Hello-World",
    },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      defaultValue: "get_repository",
      options: [
        { label: "Get repository", value: "get_repository" },
        { label: "List open issues", value: "list_issues" },
        { label: "List open pull requests", value: "list_pull_requests" },
        { label: "Create issue", value: "create_issue" },
      ],
    },
    {
      key: "perPage",
      label: "List page size",
      type: "number",
      defaultValue: 5,
      min: 1,
      max: 100,
      description: "For list issues / pull requests",
    },
    {
      key: "issueTitle",
      label: "Issue title",
      type: "text",
      placeholder: "Bug: …",
      showWhen: { field: "operation", value: "create_issue" },
    },
    {
      key: "issueBody",
      label: "Issue body",
      type: "textarea",
      rows: 4,
      placeholder: "Describe the issue…",
      showWhen: { field: "operation", value: "create_issue" },
    },
  ],

  "google-calendar": [
    {
      key: "authMode",
      label: "Authentication",
      type: "select",
      required: true,
      defaultValue: "oauth_connection",
      options: [
        {
          label: "Connected Google account (OAuth)",
          value: "oauth_connection",
        },
        {
          label: "Manual — token / {{secrets.*}} / service account JSON",
          value: "manual",
        },
      ],
    },
    {
      key: "googleConnectionId",
      label: "Google account",
      type: "google-account",
      required: true,
      showWhen: { field: "authMode", value: "oauth_connection" },
    },
    {
      key: "credentialType",
      label: "Credential type",
      type: "select",
      required: true,
      defaultValue: "oauth_access_token",
      options: [
        { label: "OAuth access token (Bearer)", value: "oauth_access_token" },
        { label: "Service account JSON", value: "service_account_json" },
      ],
      showWhen: { field: "authMode", value: "manual" },
      description:
        "OAuth for user calendars; service account only if calendar is shared with the SA email.",
    },
    {
      key: "credentialsSecret",
      label: "Credentials / token",
      type: "password",
      placeholder: "{{secrets.GOOGLE_CAL_OAUTH}}",
      showWhen: { field: "authMode", value: "manual" },
      description:
        "Enable Calendar API in GCP; store token or SA JSON in Secrets when possible.",
    },
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "text",
      required: true,
      defaultValue: "primary",
      placeholder: "primary",
    },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      defaultValue: "list_events",
      options: [
        { label: "List events", value: "list_events" },
        { label: "Get event", value: "get_event" },
        { label: "Create event", value: "create_event" },
        { label: "Update event", value: "update_event" },
        { label: "Delete event", value: "delete_event" },
      ],
    },
    {
      key: "timeMin",
      label: "List from",
      type: "datetime",
      showWhen: { field: "operation", value: "list_events" },
    },
    {
      key: "timeMax",
      label: "List until",
      type: "datetime",
      showWhen: { field: "operation", value: "list_events" },
    },
    {
      key: "eventId",
      label: "Event ID",
      type: "text",
      placeholder: "From Google Calendar",
      showWhen: {
        field: "operation",
        value: ["get_event", "update_event", "delete_event"],
      },
    },
    {
      key: "eventSummary",
      label: "Event title",
      type: "text",
      placeholder: "Team sync",
      showWhen: {
        field: "operation",
        value: ["create_event", "update_event"],
      },
    },
    {
      key: "eventDescription",
      label: "Description",
      type: "textarea",
      rows: 3,
      showWhen: {
        field: "operation",
        value: ["create_event", "update_event"],
      },
    },
    {
      key: "eventStart",
      label: "Start",
      type: "datetime",
      showWhen: { field: "operation", value: "create_event" },
    },
    {
      key: "eventEnd",
      label: "End",
      type: "datetime",
      showWhen: { field: "operation", value: "create_event" },
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "text",
      defaultValue: "UTC",
      placeholder: "America/Los_Angeles",
    },
    {
      key: "location",
      label: "Location",
      type: "text",
      showWhen: {
        field: "operation",
        value: ["create_event", "update_event"],
      },
    },
    {
      key: "attendeesJson",
      label: "Attendees (JSON)",
      type: "json",
      rows: 3,
      defaultValue: [],
      showWhen: {
        field: "operation",
        value: ["create_event", "update_event"],
      },
    },
  ],

  "google-meet": [
    {
      key: "authMode",
      label: "Authentication",
      type: "select",
      required: true,
      defaultValue: "oauth_connection",
      options: [
        {
          label: "Connected Google account (OAuth)",
          value: "oauth_connection",
        },
        {
          label: "Manual — token / {{secrets.*}} / service account JSON",
          value: "manual",
        },
      ],
    },
    {
      key: "googleConnectionId",
      label: "Google account",
      type: "google-account",
      required: true,
      showWhen: { field: "authMode", value: "oauth_connection" },
    },
    {
      key: "credentialType",
      label: "Credential type",
      type: "select",
      required: true,
      defaultValue: "oauth_access_token",
      options: [
        { label: "OAuth access token (Bearer)", value: "oauth_access_token" },
        { label: "Service account JSON", value: "service_account_json" },
      ],
      showWhen: { field: "authMode", value: "manual" },
    },
    {
      key: "credentialsSecret",
      label: "Credentials / token",
      type: "password",
      placeholder: "{{secrets.GOOGLE_CAL_OAUTH}}",
      showWhen: { field: "authMode", value: "manual" },
      description: "Meet uses Calendar API + conferenceData (hangoutsMeet).",
    },
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "text",
      required: true,
      defaultValue: "primary",
    },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      defaultValue: "create_scheduled_meeting",
      options: [
        {
          label: "Create new event + Meet link",
          value: "create_scheduled_meeting",
        },
        {
          label: "Attach Meet to existing event",
          value: "attach_meet_to_event",
        },
      ],
    },
    {
      key: "meetingTitle",
      label: "Meeting title",
      type: "text",
      required: true,
      defaultValue: "Video call",
      showWhen: { field: "operation", value: "create_scheduled_meeting" },
    },
    {
      key: "startTime",
      label: "Start",
      type: "datetime",
      showWhen: { field: "operation", value: "create_scheduled_meeting" },
    },
    {
      key: "endTime",
      label: "End",
      type: "datetime",
      showWhen: { field: "operation", value: "create_scheduled_meeting" },
    },
    {
      key: "existingEventId",
      label: "Existing event ID",
      type: "text",
      showWhen: { field: "operation", value: "attach_meet_to_event" },
    },
    {
      key: "attendeesJson",
      label: "Attendees (JSON)",
      type: "json",
      rows: 3,
      defaultValue: [],
      showWhen: { field: "operation", value: "create_scheduled_meeting" },
    },
  ],

  "google-docs": [
    {
      key: "authMode",
      label: "Authentication",
      type: "select",
      required: true,
      defaultValue: "oauth_connection",
      options: [
        {
          label: "Connected Google account (OAuth)",
          value: "oauth_connection",
        },
        {
          label: "Manual — token / {{secrets.*}} / service account JSON",
          value: "manual",
        },
      ],
    },
    {
      key: "googleConnectionId",
      label: "Google account",
      type: "google-account",
      required: true,
      showWhen: { field: "authMode", value: "oauth_connection" },
    },
    {
      key: "credentialType",
      label: "Credential type",
      type: "select",
      required: true,
      defaultValue: "oauth_access_token",
      options: [
        { label: "OAuth access token (Bearer)", value: "oauth_access_token" },
        { label: "Service account JSON", value: "service_account_json" },
      ],
      showWhen: { field: "authMode", value: "manual" },
    },
    {
      key: "credentialsSecret",
      label: "Credentials / token",
      type: "password",
      placeholder: "{{secrets.GOOGLE_DOCS_OAUTH}}",
      showWhen: { field: "authMode", value: "manual" },
    },
    {
      key: "documentId",
      label: "Document ID",
      type: "text",
      placeholder: "From docs.google.com/.../d/DOC_ID/...",
      showWhen: {
        field: "operation",
        value: ["get_document", "append_paragraph", "replace_all_text"],
      },
    },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      defaultValue: "get_document",
      options: [
        { label: "Get document", value: "get_document" },
        { label: "Append paragraph", value: "append_paragraph" },
        { label: "Replace all text", value: "replace_all_text" },
        { label: "Create document", value: "create_document" },
      ],
    },
    {
      key: "newDocumentTitle",
      label: "New document title",
      type: "text",
      showWhen: { field: "operation", value: "create_document" },
    },
    {
      key: "appendText",
      label: "Text to append",
      type: "textarea",
      rows: 4,
      showWhen: { field: "operation", value: "append_paragraph" },
    },
    {
      key: "findText",
      label: "Find text",
      type: "text",
      showWhen: { field: "operation", value: "replace_all_text" },
    },
    {
      key: "replaceText",
      label: "Replace with",
      type: "text",
      showWhen: { field: "operation", value: "replace_all_text" },
    },
  ],

  "google-sheets": [
    {
      key: "authMode",
      label: "Authentication",
      type: "select",
      required: true,
      defaultValue: "oauth_connection",
      options: [
        {
          label: "Connected Google account (OAuth)",
          value: "oauth_connection",
        },
        {
          label: "Manual — token / {{secrets.*}} / service account JSON",
          value: "manual",
        },
      ],
    },
    {
      key: "googleConnectionId",
      label: "Google account",
      type: "google-account",
      required: true,
      showWhen: { field: "authMode", value: "oauth_connection" },
    },
    {
      key: "credentialType",
      label: "Credential type",
      type: "select",
      required: true,
      defaultValue: "oauth_access_token",
      options: [
        { label: "OAuth access token (Bearer)", value: "oauth_access_token" },
        { label: "Service account JSON", value: "service_account_json" },
      ],
      showWhen: { field: "authMode", value: "manual" },
    },
    {
      key: "credentialsSecret",
      label: "Credentials / token",
      type: "password",
      placeholder: "{{secrets.GOOGLE_SHEETS_OAUTH}}",
      showWhen: { field: "authMode", value: "manual" },
    },
    {
      key: "spreadsheetId",
      label: "Spreadsheet ID",
      type: "text",
      required: true,
      placeholder: "From sheets URL",
    },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      defaultValue: "read_range",
      options: [
        { label: "Read range", value: "read_range" },
        { label: "Append rows", value: "append_rows" },
        { label: "Update range", value: "update_values" },
        { label: "Clear range", value: "clear_range" },
      ],
    },
    {
      key: "rangeA1",
      label: "Range (A1)",
      type: "text",
      required: true,
      defaultValue: "Sheet1!A1:D10",
    },
    {
      key: "valuesJson",
      label: "Values (2D JSON)",
      type: "json",
      rows: 5,
      defaultValue: [["A", "B"]],
      showWhen: {
        field: "operation",
        value: ["append_rows", "update_values"],
      },
    },
    {
      key: "valueInputOption",
      label: "Value input option",
      type: "select",
      defaultValue: "USER_ENTERED",
      options: [
        { label: "USER_ENTERED", value: "USER_ENTERED" },
        { label: "RAW", value: "RAW" },
      ],
      showWhen: {
        field: "operation",
        value: ["append_rows", "update_values"],
      },
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
      description:
        "Dot-notation path to the value being evaluated (from previous step output)",
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
      description:
        "The value to compare against (not needed for Is Empty / Exists)",
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
      defaultValue: [
        { value: "typeA", label: "Type A" },
        { value: "typeB", label: "Type B" },
      ],
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
      key: "agentType",
      label: "Agent Type",
      type: "select",
      required: true,
      defaultValue: "executor",
      options: [
        { label: "Executor (Tool-using agent)", value: "executor" },
        { label: "Planner (Creates plans)", value: "planner" },
        { label: "Analyzer (Data analysis)", value: "analyzer" },
        { label: "Recovery (Error handling)", value: "recovery" },
      ],
      description: "Type of agent behavior",
    },
    {
      key: "systemPrompt",
      label: "System Prompt",
      type: "textarea",
      required: true,
      rows: 5,
      placeholder:
        "You are a helpful assistant that summarizes customer feedback into actionable insights...",
      description: "Instructions that define the agent's role and behavior",
    },
    {
      key: "userPromptTemplate",
      label: "User Prompt Template",
      type: "textarea",
      required: true,
      rows: 4,
      placeholder:
        "Analyze the following feedback:\n\n{{payload.text}}\n\nProvide a summary and sentiment score.",
      description:
        "Template for the user message — {{variable}} syntax supported",
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
    {
      key: "maxIterations",
      label: "Max Iterations",
      type: "number",
      defaultValue: 10,
      min: 1,
      max: 50,
      description: "Maximum tool-calling iterations before stopping",
    },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      defaultValue: 30000,
      min: 1000,
      max: 300000,
      description: "Maximum execution time in milliseconds",
    },
    {
      key: "stopOnError",
      label: "Stop on Error",
      type: "boolean",
      defaultValue: false,
      description: "Stop the agent if a tool call fails",
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
      placeholder:
        "Hello {{payload.name}}, your order #{{payload.orderId}} is ready.",
      description:
        "Template string (for template op) or regex pattern (for regex op)",
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

  // Chat Model (sub-node for AI Agent)
  "chat-model": [
    {
      key: "provider",
      label: "Provider",
      type: "select",
      required: true,
      defaultValue: "openrouter",
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Anthropic", value: "anthropic" },
        { label: "Google (Gemini)", value: "google" },
        { label: "OpenRouter", value: "openrouter" },
        { label: "Groq", value: "groq" },
        { label: "Local (Ollama)", value: "local" },
      ],
      description: "The LLM provider to use",
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      defaultValue: "gpt-4o",
      placeholder: "e.g., gpt-4o, claude-3-5-sonnet, gemini-1.5-pro",
      description: "Model name or ID to use",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "sk-... or use {{secrets.OPENAI_KEY}}",
      description: "API key for the selected provider",
    },
    {
      key: "baseUrl",
      label: "Base URL",
      type: "url",
      placeholder: "https://openrouter.ai/api/v1",
      description: "Custom API base URL (leave empty for default)",
    },
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      defaultValue: 0.7,
      min: 0,
      max: 2,
      description: "Controls randomness (0 = deterministic, 2 = creative)",
    },
    {
      key: "maxTokens",
      label: "Max Tokens",
      type: "number",
      defaultValue: 4096,
      min: 1,
      max: 128000,
      description: "Maximum response length in tokens",
    },
  ],

  // Agent Memory (sub-node for AI Agent)
  "agent-memory": [
    {
      key: "memoryType",
      label: "Memory Type",
      type: "select",
      required: true,
      defaultValue: "conversation",
      options: [
        { label: "Conversation History", value: "conversation" },
        { label: "Vector Store", value: "vector" },
        { label: "Key-Value", value: "key_value" },
        { label: "Episodic", value: "episodic" },
      ],
      description: "How the agent stores and retrieves context",
    },
    {
      key: "maxEntries",
      label: "Max Entries",
      type: "number",
      defaultValue: 100,
      min: 1,
      max: 100000,
      description: "Maximum number of entries to retain",
    },
    {
      key: "connectionId",
      label: "Connection ID",
      type: "text",
      placeholder: "e.g., pinecone_prod",
      description: "Vector database connection ID (for vector memory)",
      showWhen: { field: "memoryType", value: "vector" },
    },
    {
      key: "embeddingModel",
      label: "Embedding Model",
      type: "select",
      defaultValue: "text-embedding-3-small",
      options: [
        { label: "text-embedding-3-large", value: "text-embedding-3-large" },
        { label: "text-embedding-3-small", value: "text-embedding-3-small" },
        { label: "text-embedding-ada-002", value: "text-embedding-ada-002" },
      ],
      description: "Model for generating vector embeddings",
      showWhen: { field: "memoryType", value: "vector" },
    },
    {
      key: "retentionDays",
      label: "Retention (days)",
      type: "number",
      defaultValue: 30,
      min: 1,
      max: 365,
      description: "How long to keep memory entries",
    },
  ],

  // Agent Tool (sub-node for AI Agent)
  "agent-tool": [
    {
      key: "toolType",
      label: "Tool Type",
      type: "select",
      required: true,
      defaultValue: "http",
      options: [
        { label: "HTTP Request", value: "http" },
        { label: "Code Interpreter", value: "code" },
        { label: "Calculator", value: "calculator" },
        { label: "Database Query", value: "database" },
        { label: "Web Search", value: "search" },
        { label: "File Reader", value: "file" },
        { label: "Custom Function", value: "custom" },
      ],
      description: "Type of tool the agent can invoke",
    },
    {
      key: "toolName",
      label: "Tool Name",
      type: "text",
      required: true,
      placeholder: "e.g., search_web, query_db",
      description: "Name the agent will use to invoke this tool",
    },
    {
      key: "toolDescription",
      label: "Description",
      type: "textarea",
      rows: 2,
      placeholder: "Describe what this tool does so the agent knows when to use it",
      description: "Natural language description for the AI agent",
    },
    {
      key: "connectionId",
      label: "Connection ID",
      type: "text",
      placeholder: "e.g., postgres_prod",
      description: "Connection ID for tools that need external access",
      showWhen: { field: "toolType", value: ["http", "database"] },
    },
    {
      key: "endpoint",
      label: "Endpoint URL",
      type: "url",
      placeholder: "https://api.example.com/search",
      description: "URL for HTTP tool requests",
      showWhen: { field: "toolType", value: "http" },
    },
    {
      key: "schema",
      label: "Input Schema (JSON)",
      type: "textarea",
      placeholder: '{\n  "query": { "type": "string", "description": "Search query" }\n}',
      description: "JSON schema describing the tool's input parameters",
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
      label: "Wait until",
      type: "datetime",
      description: "Target time (stored as ISO 8601 UTC)",
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
      description: "Comma-separated list of users who can approve. Email notifications coming soon — approvals are currently handled in-app only.",
    },
    {
      key: "message",
      label: "Approval Message",
      type: "textarea",
      required: true,
      rows: 3,
      placeholder:
        "Please review the following order worth {{payload.total}}...",
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

  // ─── SLA Monitor ───────────────────────────────────────────────
  "sla-monitor": [
    {
      key: "slaName",
      label: "SLA Name",
      type: "text",
      required: true,
      placeholder: "e.g. Response Time SLA",
      description: "A friendly name so you can identify this SLA rule",
    },
    {
      key: "deadlineType",
      label: "Deadline Type",
      type: "select",
      required: true,
      defaultValue: "duration",
      description: "How the deadline is calculated",
      options: [
        { label: "Duration from now", value: "duration" },
        { label: "Fixed date/time", value: "fixed" },
        { label: "From a previous step", value: "reference" },
      ],
    },
    {
      key: "durationMinutes",
      label: "Time Limit (minutes)",
      type: "number",
      defaultValue: 60,
      min: 1,
      max: 43200,
      description: "How many minutes before the SLA breaches",
      showWhen: { field: "deadlineType", value: "duration" },
    },
    {
      key: "warningThreshold",
      label: "Warning At (%)",
      type: "number",
      defaultValue: 80,
      min: 10,
      max: 99,
      description: "Send a warning when this percentage of time has passed",
    },
    {
      key: "escalationAction",
      label: "On Breach",
      type: "select",
      defaultValue: "notify",
      description: "What happens if the deadline is missed",
      options: [
        { label: "Send notification", value: "notify" },
        { label: "Escalate to manager", value: "escalate" },
        { label: "Auto-reassign task", value: "reassign" },
        { label: "Pause workflow", value: "pause" },
      ],
    },
    {
      key: "notifyChannel",
      label: "Notification Channel",
      type: "select",
      defaultValue: "email",
      description: "How to send the warning or breach alert",
      options: [
        { label: "Email", value: "email" },
        { label: "Slack", value: "slack" },
        { label: "Both", value: "both" },
      ],
    },
    {
      key: "notifyTo",
      label: "Notify Who",
      type: "text",
      placeholder: "e.g. ops-team@company.com or #alerts",
      description: "Email address or Slack channel to receive alerts",
    },
  ],

  // ─── Audit Log ─────────────────────────────────────────────────
  "audit-log": [
    {
      key: "logLevel",
      label: "Detail Level",
      type: "select",
      required: true,
      defaultValue: "standard",
      description: "How much detail to record",
      options: [
        { label: "Basic — just decisions", value: "basic" },
        { label: "Standard — decisions + data", value: "standard" },
        { label: "Detailed — everything", value: "detailed" },
      ],
    },
    {
      key: "logCategory",
      label: "Category",
      type: "select",
      defaultValue: "general",
      description: "Group this log entry under a category for easy filtering",
      options: [
        { label: "General", value: "general" },
        { label: "Financial", value: "financial" },
        { label: "Compliance", value: "compliance" },
        { label: "Security", value: "security" },
        { label: "Operational", value: "operational" },
      ],
    },
    {
      key: "message",
      label: "Log Message",
      type: "textarea",
      rows: 3,
      required: true,
      placeholder: "e.g. Purchase order {{payload.poNumber}} approved by {{payload.approver}}",
      description: "What to record — use {{variable}} for dynamic values",
    },
    {
      key: "includeInputData",
      label: "Include Input Data",
      type: "boolean",
      defaultValue: true,
      description: "Also save the data that was passed into this step",
    },
    {
      key: "retentionDays",
      label: "Keep For (days)",
      type: "number",
      defaultValue: 365,
      min: 30,
      max: 3650,
      description: "How long to keep this log entry before it can be archived",
    },
  ],

  // ─── Task Assigner ─────────────────────────────────────────────
  "task-assigner": [
    {
      key: "assignmentMode",
      label: "How to Assign",
      type: "select",
      required: true,
      defaultValue: "specific",
      description: "Choose how the task gets assigned to someone",
      options: [
        { label: "Specific person", value: "specific" },
        { label: "Team (round-robin)", value: "round-robin" },
        { label: "Based on rules", value: "rule-based" },
        { label: "AI decides", value: "ai-auto" },
      ],
    },
    {
      key: "assignee",
      label: "Assign To",
      type: "text",
      placeholder: "e.g. john@company.com",
      description: "Email or username of the person",
      showWhen: { field: "assignmentMode", value: "specific" },
    },
    {
      key: "teamMembers",
      label: "Team Members",
      type: "textarea",
      rows: 3,
      placeholder: "One email per line:\njohn@company.com\njane@company.com",
      description: "List of team members to rotate tasks between",
      showWhen: { field: "assignmentMode", value: "round-robin" },
    },
    {
      key: "taskTitle",
      label: "Task Title",
      type: "text",
      required: true,
      placeholder: "e.g. Review purchase order #{{payload.poNumber}}",
      description: "Title of the task — use {{variable}} for dynamic values",
    },
    {
      key: "taskDescription",
      label: "Task Details",
      type: "textarea",
      rows: 4,
      placeholder: "Describe what needs to be done...",
      description: "Detailed instructions for the person receiving this task",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      defaultValue: "medium",
      description: "How urgent is this task",
      options: [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" },
      ],
    },
    {
      key: "dueDateMinutes",
      label: "Due In (minutes)",
      type: "number",
      defaultValue: 1440,
      min: 5,
      max: 43200,
      description: "How many minutes from now until this task is due (1440 = 1 day)",
    },
    {
      key: "notifyAssignee",
      label: "Send Notification",
      type: "boolean",
      defaultValue: true,
      description: "Notify the assigned person via email or Slack",
    },
  ],

  // ─── Escalation ────────────────────────────────────────────────
  escalation: [
    {
      key: "escalationReason",
      label: "Reason",
      type: "select",
      required: true,
      defaultValue: "sla-breach",
      description: "Why is this being escalated",
      options: [
        { label: "SLA breach", value: "sla-breach" },
        { label: "Error occurred", value: "error" },
        { label: "Manual flag", value: "manual" },
        { label: "Threshold exceeded", value: "threshold" },
        { label: "Approval needed", value: "approval-needed" },
      ],
    },
    {
      key: "escalateTo",
      label: "Escalate To",
      type: "text",
      required: true,
      placeholder: "e.g. manager@company.com or #escalations",
      description: "Who should be notified — email or Slack channel",
    },
    {
      key: "severity",
      label: "Severity",
      type: "select",
      defaultValue: "medium",
      description: "How serious is this escalation",
      options: [
        { label: "Low — informational", value: "low" },
        { label: "Medium — needs attention", value: "medium" },
        { label: "High — urgent action needed", value: "high" },
        { label: "Critical — immediate response", value: "critical" },
      ],
    },
    {
      key: "message",
      label: "Escalation Message",
      type: "textarea",
      rows: 4,
      required: true,
      placeholder: "e.g. Purchase order exceeded budget limit...",
      description: "Message to include with the escalation — use {{variable}} for dynamic values",
    },
    {
      key: "includeContext",
      label: "Include Workflow Context",
      type: "boolean",
      defaultValue: true,
      description: "Attach the full workflow history so the reviewer has context",
    },
    {
      key: "waitForResponse",
      label: "Wait for Response",
      type: "boolean",
      defaultValue: false,
      description: "Pause the workflow until the escalation is acknowledged",
    },
  ],

  // ─── Data Enrichment ───────────────────────────────────────────
  "data-enrichment": [
    {
      key: "enrichmentType",
      label: "Enrichment Type",
      type: "select",
      required: true,
      defaultValue: "ai-lookup",
      description: "How to find the extra information",
      options: [
        { label: "AI-powered lookup", value: "ai-lookup" },
        { label: "Database query", value: "database" },
        { label: "API call", value: "api" },
        { label: "Combine multiple sources", value: "merge" },
      ],
    },
    {
      key: "sourceField",
      label: "Source Field",
      type: "text",
      required: true,
      placeholder: "e.g. payload.email or payload.companyName",
      description: "Which field from the previous step to use for the lookup",
    },
    {
      key: "outputFields",
      label: "Fields to Add",
      type: "textarea",
      rows: 3,
      placeholder: "One per line:\ncompany_size\nindustry\nlocation",
      description: "What new information to look up and add to the data",
    },
    {
      key: "aiPrompt",
      label: "AI Instructions",
      type: "textarea",
      rows: 4,
      placeholder: "e.g. Look up the company and find their industry, size, and HQ location",
      description: "Tell the AI what information to find",
      showWhen: { field: "enrichmentType", value: "ai-lookup" },
    },
    {
      key: "apiUrl",
      label: "API URL",
      type: "url",
      placeholder: "https://api.example.com/lookup",
      description: "External API to call for enrichment data",
      showWhen: { field: "enrichmentType", value: "api" },
    },
    {
      key: "fallbackBehavior",
      label: "If Lookup Fails",
      type: "select",
      defaultValue: "continue",
      description: "What to do if the enrichment data can't be found",
      options: [
        { label: "Continue anyway", value: "continue" },
        { label: "Use default values", value: "defaults" },
        { label: "Stop and report error", value: "error" },
      ],
    },
  ],

  // ─── Document Generator ────────────────────────────────────────
  "document-generator": [
    {
      key: "documentType",
      label: "Document Type",
      type: "select",
      required: true,
      defaultValue: "report",
      description: "What kind of document to create",
      options: [
        { label: "Report", value: "report" },
        { label: "Contract", value: "contract" },
        { label: "Invoice", value: "invoice" },
        { label: "Summary", value: "summary" },
        { label: "Letter", value: "letter" },
        { label: "Custom template", value: "custom" },
      ],
    },
    {
      key: "title",
      label: "Document Title",
      type: "text",
      required: true,
      placeholder: "e.g. Monthly Sales Report — {{payload.month}}",
      description: "Title of the document — use {{variable}} for dynamic values",
    },
    {
      key: "template",
      label: "Content Template",
      type: "textarea",
      rows: 8,
      required: true,
      placeholder: "Write your template here. Use {{variable}} to insert data.\n\nExample:\nDear {{payload.name}},\n\nYour order #{{payload.orderId}} has been processed...",
      description: "The document content — use {{variable}} to insert data from previous steps",
    },
    {
      key: "outputFormat",
      label: "Output Format",
      type: "select",
      defaultValue: "pdf",
      description: "File format for the generated document",
      options: [
        { label: "PDF", value: "pdf" },
        { label: "Word (.docx)", value: "docx" },
        { label: "Plain Text", value: "text" },
        { label: "HTML", value: "html" },
        { label: "Markdown", value: "markdown" },
      ],
    },
    {
      key: "includeTimestamp",
      label: "Add Date/Time",
      type: "boolean",
      defaultValue: true,
      description: "Automatically add the current date and time to the document",
    },
    {
      key: "storeAsArtifact",
      label: "Save as Artifact",
      type: "boolean",
      defaultValue: true,
      description: "Store the document so it can be downloaded later",
    },
  ],

  // ─── Form Input ────────────────────────────────────────────────
  "form-input": [
    {
      key: "formTitle",
      label: "Form Title",
      type: "text",
      required: true,
      placeholder: "e.g. New Employee Information",
      description: "Title shown at the top of the form",
    },
    {
      key: "formDescription",
      label: "Instructions",
      type: "textarea",
      rows: 2,
      placeholder: "e.g. Please fill in the details below to get started",
      description: "Brief instructions shown to the person filling out the form",
    },
    {
      key: "fields",
      label: "Form Fields (JSON)",
      type: "json",
      rows: 8,
      required: true,
      defaultValue: [
        { name: "full_name", label: "Full Name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "notes", label: "Additional Notes", type: "textarea", required: false },
      ],
      description: "Define the fields on your form — each needs a name, label, and type",
    },
    {
      key: "submitLabel",
      label: "Submit Button Text",
      type: "text",
      defaultValue: "Submit",
      placeholder: "e.g. Submit, Next, Continue",
      description: "Text shown on the submit button",
    },
    {
      key: "notifyOnSubmit",
      label: "Notify on Submit",
      type: "boolean",
      defaultValue: false,
      description: "Send a notification when someone fills out this form",
    },
    {
      key: "timeoutMinutes",
      label: "Form Timeout (minutes)",
      type: "number",
      defaultValue: 1440,
      min: 5,
      max: 43200,
      description: "How long to wait for a response before timing out (1440 = 1 day)",
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
    id: "procurement-to-payment",
    name: "Procurement to Payment",
    description: "Automates purchasing — from request form to approval, PO generation, and delivery tracking",
    icon: FileOutput,
    steps: [
      "Collect purchase request via form",
      "AI validates and categorizes the request",
      "Budget check — routes high-value for approval",
      "Manager approves or rejects",
      "AI generates purchase order",
      "Create PO document (PDF)",
      "Assign to procurement team",
      "Track delivery with SLA monitor",
      "Record full audit trail",
    ],
    nodes: ["form-input", "ai-agent", "if-condition", "approval", "ai-agent", "document-generator", "task-assigner", "sla-monitor", "audit-log"],
  },
  {
    id: "employee-onboarding",
    name: "Employee Onboarding",
    description: "Streamlines new hire setup — accounts, tasks, welcome packet, and check-in reminders",
    icon: Users,
    steps: [
      "Collect new hire details via form",
      "AI creates personalized onboarding plan",
      "Assign IT setup tasks to IT team",
      "Assign HR paperwork tasks",
      "Enrich with team and department info",
      "Generate welcome packet document",
      "Send welcome email to new hire",
      "Set 30-day check-in reminder",
      "Log onboarding for HR records",
    ],
    nodes: ["form-input", "ai-agent", "task-assigner", "task-assigner", "data-enrichment", "document-generator", "email-send", "sla-monitor", "audit-log"],
  },
  {
    id: "contract-lifecycle",
    name: "Contract Lifecycle",
    description: "Manages contracts end-to-end — AI drafts, legal reviews, tracks signatures, escalates overdue",
    icon: FileText,
    steps: [
      "Receive contract request",
      "Collect contract details via form",
      "AI drafts the contract",
      "Generate contract PDF",
      "Legal team reviews and approves",
      "Check approval decision",
      "Send contract for signature",
      "Track signature deadline",
      "Escalate if overdue",
      "Record all decisions in audit log",
    ],
    nodes: ["entry-point", "form-input", "ai-agent", "document-generator", "approval", "if-condition", "email-send", "sla-monitor", "escalation", "audit-log"],
  },
  {
    id: "meeting-intelligence",
    name: "Meeting Intelligence",
    description: "Turns meetings into action — extracts decisions, assigns tasks, tracks completion",
    icon: Brain,
    steps: [
      "Receive meeting transcript",
      "AI extracts key decisions",
      "AI identifies action items and owners",
      "Assign action items to team members",
      "Share summary on Slack",
      "Monitor task completion SLA",
      "Escalate stalled tasks",
      "Log meeting record",
    ],
    nodes: ["entry-point", "ai-agent", "ai-agent", "task-assigner", "slack-send", "sla-monitor", "escalation", "audit-log"],
  },
  {
    id: "multi-agent-collaboration",
    name: "Multi-Agent Collaboration",
    description: "Multiple AI agents collaborate — plan, research, analyze, decide, and execute complex tasks",
    icon: Brain,
    steps: [
      "Receive complex task input",
      "AI planner breaks task into sub-tasks",
      "Route by complexity to specialist agents",
      "Data retrieval agent gathers information",
      "Analysis agent identifies patterns",
      "Decision agent makes recommendations",
      "Human verifies AI recommendations",
      "Execution agent compiles final report",
      "Generate polished report document",
      "Record decision trail",
    ],
    nodes: ["entry-point", "ai-agent", "switch-case", "data-enrichment", "ai-agent", "ai-agent", "approval", "ai-agent", "document-generator", "audit-log"],
  },
  {
    id: "workflow-health-monitor",
    name: "Workflow Health Monitor",
    description: "Monitors workflows for issues — catches drift, predicts bottlenecks, escalates before SLA breaches",
    icon: ShieldCheck,
    steps: [
      "Run on scheduled health check",
      "Fetch workflow execution metrics",
      "AI analyzes health patterns and anomalies",
      "Check if issues were detected",
      "Gather additional context on flagged items",
      "AI predicts future bottlenecks",
      "Check SLA compliance",
      "Escalate critical issues",
      "Post health report to Slack",
      "Log health check results",
    ],
    nodes: ["entry-point", "http-request", "ai-agent", "if-condition", "data-enrichment", "ai-agent", "sla-monitor", "escalation", "slack-send", "audit-log"],
  },
  {
    id: "customer-support",
    name: "Customer Support Automation",
    description: "AI-powered support — classifies tickets, drafts responses, tracks resolution SLAs",
    icon: MessageSquare,
    steps: [
      "Receive new support ticket",
      "AI classifies issue type and urgency",
      "Route by category to right team",
      "Look up customer history",
      "AI drafts personalized response",
      "Agent reviews response",
      "Send approved response to customer",
      "Track resolution time SLA",
      "Log ticket activity",
    ],
    nodes: ["entry-point", "ai-agent", "switch-case", "data-enrichment", "ai-agent", "approval", "email-send", "sla-monitor", "audit-log"],
  },
  {
    id: "incident-management",
    name: "Incident Management",
    description: "Handles incidents end-to-end — severity analysis, responder assignment, postmortem generation",
    icon: ShieldAlert,
    steps: [
      "Receive system alert",
      "AI analyzes severity and impact",
      "Route by severity level",
      "Escalate critical incidents to leadership",
      "Assign on-call responder",
      "Post to incident Slack channel",
      "Track resolution SLA",
      "AI generates postmortem report",
      "Create incident report document",
      "Log incident for compliance",
    ],
    nodes: ["entry-point", "ai-agent", "switch-case", "escalation", "task-assigner", "slack-send", "sla-monitor", "ai-agent", "document-generator", "audit-log"],
  },
  {
    id: "sales-outreach",
    name: "Sales Outreach",
    description: "Qualifies leads automatically — enriches data, scores quality, personalizes outreach",
    icon: Mail,
    steps: [
      "Receive new lead",
      "Enrich with company data",
      "AI scores lead quality",
      "Check if lead qualifies",
      "AI personalizes outreach email",
      "Sales rep reviews before sending",
      "Send personalized email",
      "Wait for follow-up timing",
      "AI analyzes prospect response",
      "Log all outreach activity",
    ],
    nodes: ["entry-point", "data-enrichment", "ai-agent", "if-condition", "ai-agent", "approval", "email-send", "delay", "ai-agent", "audit-log"],
  },
];
