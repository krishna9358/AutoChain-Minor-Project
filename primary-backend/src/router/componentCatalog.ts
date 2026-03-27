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
  | "multi-select"
  | "google-account"
  | "datetime";

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
  /** When set, the field is shown only if `config[field]` matches `value` (or one of `value` if array). */
  showWhen?: { field: string; value: string | string[] };
}

function refineGoogleNodeAuth(
  val: { authMode?: string; googleConnectionId?: string; credentialsSecret?: string },
  ctx: z.RefinementCtx,
) {
  const explicit = String(val.authMode || "").toLowerCase();
  const mode: "oauth_connection" | "manual" =
    explicit === "manual"
      ? "manual"
      : explicit === "oauth_connection"
        ? "oauth_connection"
        : String(val.credentialsSecret ?? "").trim()
          ? "manual"
          : "oauth_connection";
  if (mode === "oauth_connection") {
    if (!String(val.googleConnectionId ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a connected Google account (Dashboard → Integrations → Google) or use Manual auth",
        path: ["googleConnectionId"],
      });
    }
  } else if (mode === "manual") {
    if (!String(val.credentialsSecret ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "credentialsSecret is required for manual auth (token, {{secrets.*}}, or service account JSON)",
        path: ["credentialsSecret"],
      });
    }
  } else {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "authMode must be oauth_connection or manual",
      path: ["authMode"],
    });
  }
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
    configSchema: z
      .object({
        triggerMode: z.enum(["manual", "webhook", "schedule", "api"]).default("manual"),
        webhookPath: z.string().optional(),
        cron: z.string().optional(),
        inputSchema: JsonRecordSchema.optional(),
        testRunPlainText: z.string().optional(),
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
  {
    id: "github",
    version: "1.0.0",
    name: "GitHub",
    description:
      "Calls the GitHub REST API: repository metadata, open issues, open pull requests, or create an issue. Public GET operations work without a token; mutations need a PAT.",
    icon: "Github",
    category: "integration",
    tags: ["github", "git", "issues", "pull request", "repository", "api"],
    configFields: [
      {
        key: "personalAccessToken",
        label: "Personal Access Token",
        type: "password",
        placeholder: "ghp_… or github_pat_… or {{secrets.GITHUB_TOKEN}}",
        description:
          "Optional for public repo reads. Required for private repos and for **Create issue**.",
      },
      { key: "owner", label: "Owner / Organization", type: "text", required: true, placeholder: "octocat" },
      { key: "repo", label: "Repository", type: "text", required: true, placeholder: "Hello-World" },
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
        description: "Max items for list issues / pull requests",
      },
      {
        key: "issueTitle",
        label: "Issue title",
        type: "text",
        placeholder: "Bug: …",
        description: "Required when operation is **Create issue**",
      },
      {
        key: "issueBody",
        label: "Issue body",
        type: "textarea",
        rows: 4,
        placeholder: "Describe the issue…",
        description: "Optional body for **Create issue**",
      },
    ],
    configSchema: z
      .object({
        personalAccessToken: z.string().optional(),
        owner: z.string().min(1),
        repo: z.string().min(1),
        operation: z
          .enum(["get_repository", "list_issues", "list_pull_requests", "create_issue"])
          .default("get_repository"),
        perPage: z.number().int().min(1).max(100).optional().default(5),
        issueTitle: z.string().optional(),
        issueBody: z.string().optional(),
      })
      .superRefine((val, ctx) => {
        if (val.operation === "create_issue" && !(val.issueTitle && val.issueTitle.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "issueTitle is required when operation is create_issue",
            path: ["issueTitle"],
          });
        }
      }),
    inputSchema: z.object({ payload: z.any().optional() }),
    outputSchema: z.object({
      ok: z.boolean().optional(),
      operation: z.string().optional(),
      fullName: z.string().optional(),
      issues: z.array(z.any()).optional(),
      pulls: z.array(z.any()).optional(),
      issueNumber: z.union([z.number(), z.string()]).optional(),
      htmlUrl: z.string().optional(),
    }),
  },
  {
    id: "google-calendar",
    version: "1.0.0",
    name: "Google Calendar",
    description:
      "Uses **Google Calendar API v3** only (separate from Sheets/Docs). Works with **free personal Google accounts**; no paid Workspace subscription required. " +
      "**Recommended:** choose **Connected Google account** — connect once under **Dashboard → Integrations → Google** (OAuth2); the server stores a refresh token and nodes only pick which connection to use (no client secret in the browser). " +
      "**Manual** mode: OAuth access token, `{{secrets.*}}`, or service-account JSON (share calendar with the SA email). " +
      "Enable **Google Calendar API** in Google Cloud; OAuth scopes include `https://www.googleapis.com/auth/calendar`.",
    icon: "Calendar",
    category: "integration",
    tags: ["google", "calendar", "events", "scheduling", "google-calendar-api"],
    configFields: [
      {
        key: "authMode",
        label: "Authentication",
        type: "select",
        required: true,
        defaultValue: "oauth_connection",
        options: [
          { label: "Connected Google account (OAuth)", value: "oauth_connection" },
          { label: "Manual — token / {{secrets.*}} / service account JSON", value: "manual" },
        ],
        description:
          "Use a workspace **Google connection** (no secrets in the node) or **Manual** for tokens or service accounts.",
      },
      {
        key: "googleConnectionId",
        label: "Google account",
        type: "google-account",
        required: true,
        showWhen: { field: "authMode", value: "oauth_connection" },
        description: "Choose a connection from **Dashboard → Integrations → Google**.",
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
          "Use OAuth for **primary** / user calendars. Use a service account only if you have shared the calendar with the SA email.",
      },
      {
        key: "credentialsSecret",
        label: "Credentials / token",
        type: "password",
        placeholder: "{{secrets.GOOGLE_CAL_OAUTH}} or paste SA JSON (dev only)",
        showWhen: { field: "authMode", value: "manual" },
        description:
          "OAuth: short-lived **access token** (Bearer), or your app’s stored refresh flow output. Service account: full JSON key. Prefer secrets in production.",
      },
      {
        key: "calendarId",
        label: "Calendar ID",
        type: "text",
        required: true,
        defaultValue: "primary",
        placeholder: "primary or user@group.calendar.google.com",
        description: "Use **primary** for the authenticated user’s main calendar.",
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
        description: "Lower bound for **List events** (optional). Saved as ISO 8601 UTC.",
      },
      {
        key: "timeMax",
        label: "List until",
        type: "datetime",
        description: "Upper bound for **List events** (optional). Saved as ISO 8601 UTC.",
      },
      {
        key: "eventId",
        label: "Event ID",
        type: "text",
        placeholder: "abc123fromGoogle",
        description: "Required for **Get**, **Update**, and **Delete** event.",
      },
      {
        key: "eventSummary",
        label: "Event title / summary",
        type: "text",
        placeholder: "Team sync",
        description: "Required for **Create**; optional for **Update**.",
      },
      {
        key: "eventDescription",
        label: "Event description",
        type: "textarea",
        rows: 3,
        placeholder: "Agenda, links, notes…",
      },
      {
        key: "eventStart",
        label: "Start",
        type: "datetime",
        description: "Required for **Create event**. Stored as ISO 8601 UTC for the Calendar API.",
      },
      {
        key: "eventEnd",
        label: "End",
        type: "datetime",
        description: "Required for **Create event**. Must be after start.",
      },
      {
        key: "timeZone",
        label: "Time zone",
        type: "text",
        defaultValue: "UTC",
        placeholder: "America/Los_Angeles",
        description: "IANA time zone for created/updated events when using dateTime fields.",
      },
      {
        key: "location",
        label: "Location",
        type: "text",
        placeholder: "Conference room / Meet link",
      },
      {
        key: "attendeesJson",
        label: "Attendees (JSON array)",
        type: "json",
        rows: 3,
        defaultValue: [],
        description: 'Optional. Example: `[{"email":"a@b.com"},{"email":"c@d.com"}]`',
      },
    ],
    configSchema: z
      .object({
        authMode: z.enum(["oauth_connection", "manual"]).default("oauth_connection"),
        googleConnectionId: z.string().optional(),
        credentialType: z.enum(["oauth_access_token", "service_account_json"]).default("oauth_access_token"),
        credentialsSecret: z.string().optional(),
        calendarId: z.string().min(1).default("primary"),
        operation: z
          .enum(["list_events", "get_event", "create_event", "update_event", "delete_event"])
          .default("list_events"),
        timeMin: z.string().optional(),
        timeMax: z.string().optional(),
        eventId: z.string().optional(),
        eventSummary: z.string().optional(),
        eventDescription: z.string().optional(),
        eventStart: z.string().optional(),
        eventEnd: z.string().optional(),
        timeZone: z.string().optional().default("UTC"),
        location: z.string().optional(),
        attendeesJson: z.any().optional().default([]),
      })
      .superRefine((val, ctx) => {
        refineGoogleNodeAuth(val, ctx);
        if (["get_event", "delete_event", "update_event"].includes(val.operation) && !String(val.eventId ?? "").trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "eventId is required for this operation", path: ["eventId"] });
        }
        if (val.operation === "create_event") {
          if (!String(val.eventSummary ?? "").trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "eventSummary is required", path: ["eventSummary"] });
          }
          if (!String(val.eventStart ?? "").trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "eventStart is required", path: ["eventStart"] });
          }
          if (!String(val.eventEnd ?? "").trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "eventEnd is required", path: ["eventEnd"] });
          }
        }
      }),
    inputSchema: z.object({ payload: z.any().optional() }),
    outputSchema: z.object({
      ok: z.boolean().optional(),
      simulated: z.boolean().optional(),
      operation: z.string().optional(),
      events: z.array(z.any()).optional(),
      event: z.any().optional(),
    }),
  },
  {
    id: "google-meet",
    version: "1.0.0",
    name: "Google Meet",
    description:
      "Meet links are created with **Google Calendar API v3** only (`conferenceData` + `hangoutsMeet`). There is **no separate Google Meet REST API** for this pattern—Calendar is the correct free API. " +
      "**Setup:** Enable **Google Calendar API** and use OAuth or a service account with calendar access, as in the Google Calendar node. " +
      "For **Create meeting**, the node models `conferenceDataVersion: 1` and `conferenceData.createRequest` with `conferenceSolutionKey: { type: \"hangoutsMeet\" }`. " +
      "**Connected Google account** (Dashboard → Integrations) is recommended so users never paste OAuth client secrets. **Manual** mode supports tokens and service accounts.",
    icon: "Video",
    category: "integration",
    tags: ["google", "meet", "video", "conference", "calendar-api", "hangoutsMeet"],
    configFields: [
      {
        key: "authMode",
        label: "Authentication",
        type: "select",
        required: true,
        defaultValue: "oauth_connection",
        options: [
          { label: "Connected Google account (OAuth)", value: "oauth_connection" },
          { label: "Manual — token / {{secrets.*}} / service account JSON", value: "manual" },
        ],
      },
      {
        key: "googleConnectionId",
        label: "Google account",
        type: "google-account",
        required: true,
        showWhen: { field: "authMode", value: "oauth_connection" },
        description: "Workspace Google connection (same Calendar OAuth scopes).",
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
        description: "Same as Calendar: OAuth access token or service-account JSON.",
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
        defaultValue: "create_scheduled_meeting",
        options: [
          { label: "Create new event + Meet link", value: "create_scheduled_meeting" },
          { label: "Attach Meet to existing calendar event", value: "attach_meet_to_event" },
        ],
      },
      {
        key: "meetingTitle",
        label: "Meeting title",
        type: "text",
        required: true,
        defaultValue: "Video call",
        placeholder: "Project standup",
        description: "Used when creating a **new** event with Meet.",
      },
      {
        key: "startTime",
        label: "Start",
        type: "datetime",
        description: "Required for **Create new event + Meet**. Stored as ISO 8601 UTC.",
      },
      {
        key: "endTime",
        label: "End",
        type: "datetime",
        description: "Required for **Create new event + Meet**. Must be after start.",
      },
      {
        key: "existingEventId",
        label: "Existing event ID",
        type: "text",
        placeholder: "Event id from Google Calendar",
        description: "Required for **Attach Meet to existing event** (PATCH event with conferenceData).",
      },
      {
        key: "attendeesJson",
        label: "Attendees (JSON array)",
        type: "json",
        rows: 3,
        defaultValue: [],
        description: 'Optional. `[{"email":"user@company.com"}]`',
      },
    ],
    configSchema: z
      .object({
        authMode: z.enum(["oauth_connection", "manual"]).default("oauth_connection"),
        googleConnectionId: z.string().optional(),
        credentialType: z.enum(["oauth_access_token", "service_account_json"]).default("oauth_access_token"),
        credentialsSecret: z.string().optional(),
        calendarId: z.string().min(1).default("primary"),
        operation: z.enum(["create_scheduled_meeting", "attach_meet_to_event"]).default("create_scheduled_meeting"),
        meetingTitle: z.string().optional().default("Video call"),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        existingEventId: z.string().optional(),
        attendeesJson: z.any().optional().default([]),
      })
      .superRefine((val, ctx) => {
        refineGoogleNodeAuth(val, ctx);
        if (val.operation === "create_scheduled_meeting") {
          if (!String(val.startTime ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "startTime required", path: ["startTime"] });
          if (!String(val.endTime ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "endTime required", path: ["endTime"] });
          if (!String(val.meetingTitle ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "meetingTitle required", path: ["meetingTitle"] });
        }
        if (val.operation === "attach_meet_to_event" && !String(val.existingEventId ?? "").trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "existingEventId required", path: ["existingEventId"] });
        }
      }),
    inputSchema: z.object({ payload: z.any().optional() }),
    outputSchema: z.object({
      ok: z.boolean().optional(),
      simulated: z.boolean().optional(),
      meetLink: z.string().optional(),
      htmlLink: z.string().optional(),
      eventId: z.string().optional(),
    }),
  },
  {
    id: "google-docs",
    version: "1.0.0",
    name: "Google Docs",
    description:
      "Uses **Google Docs API v1** only (`docs.googleapis.com`)—a different API from Calendar or Sheets. Works with **free personal Google accounts** when the doc is owned by or shared to that user (or to a service account). " +
      "**Setup:** (1) Enable **Google Docs API** in Google Cloud Console. " +
      "(2) OAuth consent + credentials for user docs, or service account with **shared** doc (Share → SA email). " +
      "(3) Scope example: `https://www.googleapis.com/auth/documents`. " +
      "(4) Document ID is the value in the URL: `https://docs.google.com/document/d/DOCUMENT_ID/edit`. " +
      "**Connected Google account** (Dashboard → Integrations) is recommended. **Manual** mode uses **credentialsSecret** for tokens or SA JSON.",
    icon: "FileText",
    category: "integration",
    tags: ["google", "docs", "document", "google-docs-api", "text"],
    configFields: [
      {
        key: "authMode",
        label: "Authentication",
        type: "select",
        required: true,
        defaultValue: "oauth_connection",
        options: [
          { label: "Connected Google account (OAuth)", value: "oauth_connection" },
          { label: "Manual — token / {{secrets.*}} / service account JSON", value: "manual" },
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
        placeholder: "1abc...xyz from the Doc URL",
        description: "Not required only for **Create document**.",
      },
      {
        key: "operation",
        label: "Operation",
        type: "select",
        required: true,
        defaultValue: "get_document",
        options: [
          { label: "Get document (metadata + text extract)", value: "get_document" },
          { label: "Append paragraph", value: "append_paragraph" },
          { label: "Replace all text", value: "replace_all_text" },
          { label: "Create document", value: "create_document" },
        ],
      },
      {
        key: "newDocumentTitle",
        label: "New document title",
        type: "text",
        placeholder: "Quarterly report",
        description: "Required for **Create document**.",
      },
      {
        key: "appendText",
        label: "Text to append",
        type: "textarea",
        rows: 4,
        placeholder: "Paragraph to insert at end…",
        description: "Used for **Append paragraph** (models insertText at document end).",
      },
      {
        key: "findText",
        label: "Find text",
        type: "text",
        placeholder: "Old phrase",
        description: "Used with **Replace all text**.",
      },
      {
        key: "replaceText",
        label: "Replace with",
        type: "text",
        placeholder: "New phrase",
        description: "Used with **Replace all text**.",
      },
    ],
    configSchema: z
      .object({
        authMode: z.enum(["oauth_connection", "manual"]).default("oauth_connection"),
        googleConnectionId: z.string().optional(),
        credentialType: z.enum(["oauth_access_token", "service_account_json"]).default("oauth_access_token"),
        credentialsSecret: z.string().optional(),
        documentId: z.string().optional(),
        operation: z
          .enum(["get_document", "append_paragraph", "replace_all_text", "create_document"])
          .default("get_document"),
        newDocumentTitle: z.string().optional(),
        appendText: z.string().optional(),
        findText: z.string().optional(),
        replaceText: z.string().optional(),
      })
      .superRefine((val, ctx) => {
        refineGoogleNodeAuth(val, ctx);
        if (val.operation === "create_document" && !String(val.newDocumentTitle ?? "").trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "newDocumentTitle required", path: ["newDocumentTitle"] });
        }
        if (["get_document", "append_paragraph", "replace_all_text"].includes(val.operation) && !String(val.documentId ?? "").trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "documentId required", path: ["documentId"] });
        }
        if (val.operation === "append_paragraph" && !String(val.appendText ?? "").trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "appendText required", path: ["appendText"] });
        }
        if (val.operation === "replace_all_text") {
          if (!String(val.findText ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "findText required", path: ["findText"] });
          if (!String(val.replaceText ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "replaceText required", path: ["replaceText"] });
        }
      }),
    inputSchema: z.object({ payload: z.any().optional() }),
    outputSchema: z.object({
      ok: z.boolean().optional(),
      simulated: z.boolean().optional(),
      documentId: z.string().optional(),
      title: z.string().optional(),
      textPreview: z.string().optional(),
    }),
  },
  {
    id: "google-sheets",
    version: "1.0.0",
    name: "Google Sheets",
    description:
      "Uses **Google Sheets API v4** only (`sheets.googleapis.com`)—separate from Calendar and Docs. Works with **free personal Google accounts** for spreadsheets in Drive. " +
      "**Setup:** (1) Enable **Google Sheets API** in Google Cloud Console. " +
      "(2) OAuth or service account; share the spreadsheet with the SA email if using a service account. " +
      "(3) Scope example: `https://www.googleapis.com/auth/spreadsheets`. " +
      "(4) Spreadsheet ID is in the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`. " +
      "Use A1 notation for ranges (e.g. `Sheet1!A1:D10`). **Connected Google account** (Dashboard → Integrations) is recommended; **Manual** uses tokens or SA JSON.",
    icon: "Table2",
    category: "integration",
    tags: ["google", "sheets", "spreadsheet", "csv", "google-sheets-api"],
    configFields: [
      {
        key: "authMode",
        label: "Authentication",
        type: "select",
        required: true,
        defaultValue: "oauth_connection",
        options: [
          { label: "Connected Google account (OAuth)", value: "oauth_connection" },
          { label: "Manual — token / {{secrets.*}} / service account JSON", value: "manual" },
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
        placeholder: "1abc... from sheets URL",
      },
      {
        key: "operation",
        label: "Operation",
        type: "select",
        required: true,
        defaultValue: "read_range",
        options: [
          { label: "Read range (values.get)", value: "read_range" },
          { label: "Append rows (values.append)", value: "append_rows" },
          { label: "Update range (values.update)", value: "update_values" },
          { label: "Clear range", value: "clear_range" },
        ],
      },
      {
        key: "rangeA1",
        label: "Range (A1 notation)",
        type: "text",
        required: true,
        defaultValue: "Sheet1!A1:D10",
        placeholder: "Sheet1!A1:D10",
        description: "Sheet name can include spaces if quoted per API rules.",
      },
      {
        key: "valuesJson",
        label: "Values (JSON 2D array)",
        type: "json",
        rows: 5,
        defaultValue: [["Col1", "Col2"], ["a", "b"]],
        description: "For **Append** / **Update**: rows of cells, e.g. `[['A','B'],[1,2]]`.",
      },
      {
        key: "valueInputOption",
        label: "Value input option",
        type: "select",
        defaultValue: "USER_ENTERED",
        options: [
          { label: "USER_ENTERED (parse formulas/dates)", value: "USER_ENTERED" },
          { label: "RAW (literal strings)", value: "RAW" },
        ],
        description: "Sheets API `valueInputOption` for write operations.",
      },
    ],
    configSchema: z
      .object({
        authMode: z.enum(["oauth_connection", "manual"]).default("oauth_connection"),
        googleConnectionId: z.string().optional(),
        credentialType: z.enum(["oauth_access_token", "service_account_json"]).default("oauth_access_token"),
        credentialsSecret: z.string().optional(),
        spreadsheetId: z.string().min(1),
        operation: z.enum(["read_range", "append_rows", "update_values", "clear_range"]).default("read_range"),
        rangeA1: z.string().min(1).default("Sheet1!A1:D10"),
        valuesJson: z.any().optional().default([]),
        valueInputOption: z.enum(["USER_ENTERED", "RAW"]).default("USER_ENTERED"),
      })
      .superRefine((val, ctx) => {
        refineGoogleNodeAuth(val, ctx);
        if (["append_rows", "update_values"].includes(val.operation)) {
          const v = val.valuesJson;
          const ok = Array.isArray(v) && v.length > 0;
          if (!ok) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "valuesJson must be a non-empty 2D array", path: ["valuesJson"] });
          }
        }
      }),
    inputSchema: z.object({ payload: z.any().optional() }),
    outputSchema: z.object({
      ok: z.boolean().optional(),
      simulated: z.boolean().optional(),
      operation: z.string().optional(),
      values: z.array(z.any()).optional(),
      updatedRange: z.string().optional(),
      clearedRange: z.string().optional(),
    }),
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
    version: "2.0.0",
    name: "AI Agent",
    description: "LLM-powered agent with sub-node connections for Chat Model, Memory, and Tools.",
    icon: "Bot",
    category: "ai",
    tags: ["ai", "llm", "gpt", "agent", "openai", "claude"],
    configFields: [
      { key: "agentType", label: "Agent Type", type: "select", required: true, defaultValue: "executor", options: [{ label: "Executor (Tool-using agent)", value: "executor" }, { label: "Planner (Creates plans)", value: "planner" }, { label: "Analyzer (Data analysis)", value: "analyzer" }, { label: "Recovery (Error handling)", value: "recovery" }], description: "Type of agent behavior" },
      { key: "systemPrompt", label: "System Prompt", type: "textarea", required: true, rows: 5, placeholder: "You are a helpful assistant that summarizes customer feedback into actionable insights...", description: "Instructions that define the agent's role and behavior" },
      { key: "userPromptTemplate", label: "User Prompt Template", type: "textarea", required: true, rows: 4, placeholder: "Analyze the following feedback:\n\n{{payload.text}}\n\nProvide a summary and sentiment score.", description: "Template for the user message — {{variable}} syntax supported" },
      { key: "responseFormat", label: "Response Format", type: "select", defaultValue: "text", options: [{ label: "Text", value: "text" }, { label: "JSON", value: "json" }], description: "Whether to request structured JSON output" },
      { key: "maxIterations", label: "Max Iterations", type: "number", defaultValue: 10, min: 1, max: 50, description: "Maximum tool-calling iterations before stopping" },
      { key: "timeout", label: "Timeout (ms)", type: "number", defaultValue: 30000, min: 1000, max: 300000, description: "Maximum execution time in milliseconds" },
      { key: "stopOnError", label: "Stop on Error", type: "boolean", defaultValue: false, description: "Stop the agent if a tool call fails" },
    ],
    configSchema: z.object({
      agentType: z.enum(["executor", "planner", "analyzer", "recovery"]).default("executor"),
      systemPrompt: z.string().min(1),
      userPromptTemplate: z.string().min(1),
      responseFormat: z.enum(["text", "json"]).default("text"),
      maxIterations: z.number().int().min(1).max(50).default(10),
      timeout: z.number().int().min(1000).max(300000).default(30000),
      stopOnError: z.boolean().default(false),
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

  // ─── AI SUB-NODES (connect to AI Agent handles) ────────────
  {
    id: "chat-model",
    version: "1.0.0",
    name: "Chat Model",
    description: "LLM provider configuration — connects to an AI Agent to supply the chat model.",
    icon: "RefreshCw",
    category: "ai",
    tags: ["model", "llm", "openai", "anthropic", "openrouter", "chat"],
    configFields: [
      { key: "provider", label: "Provider", type: "select", required: true, defaultValue: "openrouter", options: [{ label: "OpenAI", value: "openai" }, { label: "Anthropic", value: "anthropic" }, { label: "Google (Gemini)", value: "google" }, { label: "OpenRouter", value: "openrouter" }, { label: "Groq", value: "groq" }, { label: "Local (Ollama)", value: "local" }], description: "The LLM provider to use" },
      { key: "model", label: "Model", type: "text", required: true, defaultValue: "gpt-4o", placeholder: "e.g., gpt-4o, claude-3-5-sonnet, gemini-1.5-pro", description: "Model name or ID" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "sk-... or use {{secrets.OPENAI_KEY}}", description: "API key for the selected provider" },
      { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://openrouter.ai/api/v1", description: "Custom API base URL (leave empty for default)" },
      { key: "temperature", label: "Temperature", type: "number", defaultValue: 0.7, min: 0, max: 2, description: "Controls randomness" },
      { key: "maxTokens", label: "Max Tokens", type: "number", defaultValue: 4096, min: 1, max: 128000, description: "Maximum response length" },
    ],
    configSchema: z.object({
      provider: z.enum(["openai", "anthropic", "google", "openrouter", "groq", "local"]).default("openrouter"),
      model: z.string().min(1),
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().int().min(1).max(128000).default(4096),
    }),
    inputSchema: z.object({}),
    outputSchema: z.object({ provider: z.string(), model: z.string() }),
  },
  {
    id: "agent-memory",
    version: "1.0.0",
    name: "Memory",
    description: "Gives an AI Agent memory — conversation history, vector store, or key-value memory.",
    icon: "Database",
    category: "ai",
    tags: ["memory", "context", "vector", "conversation", "history"],
    configFields: [
      { key: "memoryType", label: "Memory Type", type: "select", required: true, defaultValue: "conversation", options: [{ label: "Conversation History", value: "conversation" }, { label: "Vector Store", value: "vector" }, { label: "Key-Value", value: "key_value" }, { label: "Episodic", value: "episodic" }], description: "How the agent stores and retrieves context" },
      { key: "maxEntries", label: "Max Entries", type: "number", defaultValue: 100, min: 1, max: 100000, description: "Maximum number of entries to retain" },
      { key: "connectionId", label: "Connection ID", type: "text", placeholder: "e.g., pinecone_prod", description: "Vector database connection ID" },
      { key: "embeddingModel", label: "Embedding Model", type: "select", defaultValue: "text-embedding-3-small", options: [{ label: "text-embedding-3-large", value: "text-embedding-3-large" }, { label: "text-embedding-3-small", value: "text-embedding-3-small" }, { label: "text-embedding-ada-002", value: "text-embedding-ada-002" }], description: "Model for vector embeddings" },
      { key: "retentionDays", label: "Retention (days)", type: "number", defaultValue: 30, min: 1, max: 365, description: "How long to keep memory entries" },
    ],
    configSchema: z.object({
      memoryType: z.enum(["conversation", "vector", "key_value", "episodic"]).default("conversation"),
      maxEntries: z.number().int().min(1).max(100000).default(100),
      connectionId: z.string().optional(),
      embeddingModel: z.string().optional(),
      retentionDays: z.number().int().min(1).max(365).default(30),
    }),
    inputSchema: z.object({}),
    outputSchema: z.object({ memoryType: z.string() }),
  },
  {
    id: "agent-tool",
    version: "1.0.0",
    name: "Tool",
    description: "External tool for an AI Agent — HTTP requests, code execution, calculators, database queries.",
    icon: "Wrench",
    category: "ai",
    tags: ["tool", "function", "http", "code", "calculator", "database"],
    configFields: [
      { key: "toolType", label: "Tool Type", type: "select", required: true, defaultValue: "http", options: [{ label: "HTTP Request", value: "http" }, { label: "Code Interpreter", value: "code" }, { label: "Calculator", value: "calculator" }, { label: "Database Query", value: "database" }, { label: "Web Search", value: "search" }, { label: "File Reader", value: "file" }, { label: "Custom Function", value: "custom" }], description: "Type of tool" },
      { key: "toolName", label: "Tool Name", type: "text", required: true, placeholder: "e.g., search_web, query_db", description: "Name the agent uses to invoke this tool" },
      { key: "toolDescription", label: "Description", type: "textarea", rows: 2, placeholder: "Describe what this tool does", description: "Natural language description for the AI agent" },
      { key: "connectionId", label: "Connection ID", type: "text", placeholder: "e.g., postgres_prod", description: "Connection ID for external access" },
      { key: "endpoint", label: "Endpoint URL", type: "text", placeholder: "https://api.example.com/search", description: "URL for HTTP tool requests" },
      { key: "schema", label: "Input Schema (JSON)", type: "textarea", placeholder: '{ "query": { "type": "string" } }', description: "JSON schema for tool input parameters" },
    ],
    configSchema: z.object({
      toolType: z.enum(["http", "code", "calculator", "database", "search", "file", "custom"]).default("http"),
      toolName: z.string().min(1),
      toolDescription: z.string().optional(),
      connectionId: z.string().optional(),
      endpoint: z.string().optional(),
      schema: z.string().optional(),
    }),
    inputSchema: z.object({}),
    outputSchema: z.object({ toolName: z.string(), result: z.any() }),
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
      {
        key: "untilTime",
        label: "Wait until",
        type: "datetime",
        showWhen: { field: "delayType", value: "until" },
        description: "Target time (stored as ISO 8601 UTC). Used when delay type is **Until Specific Time**.",
      },
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

  // ─── ENTERPRISE NODES ──────────────────────────────────────────
  {
    id: "sla-monitor",
    version: "1.0.0",
    name: "SLA Monitor",
    description: "Tracks deadlines and alerts your team before a Service Level Agreement is missed.",
    icon: "Timer",
    category: "control",
    tags: ["sla", "deadline", "monitor", "escalation", "enterprise"],
    configFields: [
      { key: "slaName", label: "SLA Name", type: "text", required: true, placeholder: "e.g. Response Time SLA", description: "A friendly name so you can identify this SLA rule" },
      { key: "deadlineType", label: "Deadline Type", type: "select", required: true, defaultValue: "duration", description: "How the deadline is calculated", options: [{ label: "Duration from now", value: "duration" }, { label: "Fixed date/time", value: "fixed" }, { label: "From a previous step", value: "reference" }] },
      { key: "durationMinutes", label: "Time Limit (minutes)", type: "number", defaultValue: 60, min: 1, max: 43200, description: "How many minutes before the SLA breaches" },
      { key: "warningThreshold", label: "Warning At (%)", type: "number", defaultValue: 80, min: 10, max: 99, description: "Send a warning when this percentage of time has passed" },
      { key: "escalationAction", label: "On Breach", type: "select", defaultValue: "notify", description: "What happens if the deadline is missed", options: [{ label: "Send notification", value: "notify" }, { label: "Escalate to manager", value: "escalate" }, { label: "Auto-reassign task", value: "reassign" }, { label: "Pause workflow", value: "pause" }] },
      { key: "notifyChannel", label: "Notification Channel", type: "select", defaultValue: "email", description: "How to send the warning or breach alert", options: [{ label: "Email", value: "email" }, { label: "Slack", value: "slack" }, { label: "Both", value: "both" }] },
      { key: "notifyTo", label: "Notify Who", type: "text", placeholder: "e.g. ops-team@company.com or #alerts", description: "Email address or Slack channel to receive alerts" },
    ],
    configSchema: z.object({
      slaName: z.string().min(1),
      deadlineType: z.enum(["duration", "fixed", "reference"]).default("duration"),
      durationMinutes: z.number().int().min(1).max(43200).default(60),
      warningThreshold: z.number().int().min(10).max(99).default(80),
      escalationAction: z.enum(["notify", "escalate", "reassign", "pause"]).default("notify"),
      notifyChannel: z.enum(["email", "slack", "both"]).default("email"),
      notifyTo: z.string().optional(),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ slaStatus: z.enum(["ok", "warning", "breached"]), remainingMs: z.number().optional() }),
  },
  {
    id: "audit-log",
    version: "1.0.0",
    name: "Audit Log",
    description: "Records every decision and action for compliance and easy review later.",
    icon: "ClipboardList",
    category: "output",
    tags: ["audit", "log", "compliance", "trail", "enterprise"],
    configFields: [
      { key: "logLevel", label: "Detail Level", type: "select", required: true, defaultValue: "standard", description: "How much detail to record", options: [{ label: "Basic — just decisions", value: "basic" }, { label: "Standard — decisions + data", value: "standard" }, { label: "Detailed — everything", value: "detailed" }] },
      { key: "logCategory", label: "Category", type: "select", defaultValue: "general", description: "Group this log entry under a category for easy filtering", options: [{ label: "General", value: "general" }, { label: "Financial", value: "financial" }, { label: "Compliance", value: "compliance" }, { label: "Security", value: "security" }, { label: "Operational", value: "operational" }] },
      { key: "message", label: "Log Message", type: "textarea", rows: 3, required: true, placeholder: "e.g. Purchase order {{payload.poNumber}} approved", description: "What to record — use {{variable}} for dynamic values" },
      { key: "includeInputData", label: "Include Input Data", type: "boolean", defaultValue: true, description: "Also save the data that was passed into this step" },
      { key: "retentionDays", label: "Keep For (days)", type: "number", defaultValue: 365, min: 30, max: 3650, description: "How long to keep this log entry before it can be archived" },
    ],
    configSchema: z.object({
      logLevel: z.enum(["basic", "standard", "detailed"]).default("standard"),
      logCategory: z.enum(["general", "financial", "compliance", "security", "operational"]).default("general"),
      message: z.string().min(1),
      includeInputData: z.boolean().default(true),
      retentionDays: z.number().int().min(30).max(3650).default(365),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ logId: z.string(), timestamp: z.string() }),
  },
  {
    id: "task-assigner",
    version: "1.0.0",
    name: "Task Assigner",
    description: "Automatically assigns tasks to the right team members with clear deadlines.",
    icon: "Users",
    category: "control",
    tags: ["task", "assign", "team", "delegation", "enterprise"],
    configFields: [
      { key: "assignmentMode", label: "How to Assign", type: "select", required: true, defaultValue: "specific", description: "Choose how the task gets assigned", options: [{ label: "Specific person", value: "specific" }, { label: "Team (round-robin)", value: "round-robin" }, { label: "Based on rules", value: "rule-based" }, { label: "AI decides", value: "ai-auto" }] },
      { key: "assignee", label: "Assign To", type: "text", placeholder: "e.g. john@company.com", description: "Email or username of the person" },
      { key: "teamMembers", label: "Team Members", type: "textarea", rows: 3, placeholder: "One email per line", description: "List of team members to rotate tasks between" },
      { key: "taskTitle", label: "Task Title", type: "text", required: true, placeholder: "e.g. Review purchase order #{{payload.poNumber}}", description: "Title of the task — use {{variable}} for dynamic values" },
      { key: "taskDescription", label: "Task Details", type: "textarea", rows: 4, placeholder: "Describe what needs to be done...", description: "Detailed instructions for the person" },
      { key: "priority", label: "Priority", type: "select", defaultValue: "medium", description: "How urgent is this task", options: [{ label: "Low", value: "low" }, { label: "Medium", value: "medium" }, { label: "High", value: "high" }, { label: "Critical", value: "critical" }] },
      { key: "dueDateMinutes", label: "Due In (minutes)", type: "number", defaultValue: 1440, min: 5, max: 43200, description: "Minutes until this task is due (1440 = 1 day)" },
      { key: "notifyAssignee", label: "Send Notification", type: "boolean", defaultValue: true, description: "Notify the assigned person via email or Slack" },
    ],
    configSchema: z.object({
      assignmentMode: z.enum(["specific", "round-robin", "rule-based", "ai-auto"]).default("specific"),
      assignee: z.string().optional(),
      teamMembers: z.string().optional(),
      taskTitle: z.string().min(1),
      taskDescription: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      dueDateMinutes: z.number().int().min(5).max(43200).default(1440),
      notifyAssignee: z.boolean().default(true),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ taskId: z.string(), assignedTo: z.string(), dueAt: z.string() }),
  },
  {
    id: "escalation",
    version: "1.0.0",
    name: "Escalation",
    description: "Sends an alert to a manager or senior team member when something needs attention.",
    icon: "AlertTriangle",
    category: "control",
    tags: ["escalate", "alert", "manager", "urgent", "enterprise"],
    configFields: [
      { key: "escalationReason", label: "Reason", type: "select", required: true, defaultValue: "sla-breach", description: "Why is this being escalated", options: [{ label: "SLA breach", value: "sla-breach" }, { label: "Error occurred", value: "error" }, { label: "Manual flag", value: "manual" }, { label: "Threshold exceeded", value: "threshold" }, { label: "Approval needed", value: "approval-needed" }] },
      { key: "escalateTo", label: "Escalate To", type: "text", required: true, placeholder: "e.g. manager@company.com or #escalations", description: "Who should be notified" },
      { key: "severity", label: "Severity", type: "select", defaultValue: "medium", description: "How serious is this escalation", options: [{ label: "Low — informational", value: "low" }, { label: "Medium — needs attention", value: "medium" }, { label: "High — urgent action needed", value: "high" }, { label: "Critical — immediate response", value: "critical" }] },
      { key: "message", label: "Escalation Message", type: "textarea", rows: 4, required: true, placeholder: "e.g. Purchase order exceeded budget limit...", description: "Message to include with the escalation" },
      { key: "includeContext", label: "Include Workflow Context", type: "boolean", defaultValue: true, description: "Attach the full workflow history" },
      { key: "waitForResponse", label: "Wait for Response", type: "boolean", defaultValue: false, description: "Pause the workflow until acknowledged" },
    ],
    configSchema: z.object({
      escalationReason: z.enum(["sla-breach", "error", "manual", "threshold", "approval-needed"]).default("sla-breach"),
      escalateTo: z.string().min(1),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      message: z.string().min(1),
      includeContext: z.boolean().default(true),
      waitForResponse: z.boolean().default(false),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ escalationId: z.string(), acknowledged: z.boolean().optional() }),
  },
  {
    id: "data-enrichment",
    version: "1.0.0",
    name: "Data Enrichment",
    description: "Pulls extra information from other systems to fill in missing details automatically.",
    icon: "Search",
    category: "ai",
    tags: ["enrich", "lookup", "data", "augment", "enterprise"],
    configFields: [
      { key: "enrichmentType", label: "Enrichment Type", type: "select", required: true, defaultValue: "ai-lookup", description: "How to find the extra information", options: [{ label: "AI-powered lookup", value: "ai-lookup" }, { label: "Database query", value: "database" }, { label: "API call", value: "api" }, { label: "Combine multiple sources", value: "merge" }] },
      { key: "sourceField", label: "Source Field", type: "text", required: true, placeholder: "e.g. payload.email", description: "Which field from the previous step to use" },
      { key: "outputFields", label: "Fields to Add", type: "textarea", rows: 3, placeholder: "One per line:\ncompany_size\nindustry", description: "What new information to look up" },
      { key: "aiPrompt", label: "AI Instructions", type: "textarea", rows: 4, placeholder: "e.g. Look up the company and find their industry and size", description: "Tell the AI what information to find" },
      { key: "apiUrl", label: "API URL", type: "url", placeholder: "https://api.example.com/lookup", description: "External API to call for enrichment data" },
      { key: "fallbackBehavior", label: "If Lookup Fails", type: "select", defaultValue: "continue", description: "What to do if enrichment data can't be found", options: [{ label: "Continue anyway", value: "continue" }, { label: "Use default values", value: "defaults" }, { label: "Stop and report error", value: "error" }] },
    ],
    configSchema: z.object({
      enrichmentType: z.enum(["ai-lookup", "database", "api", "merge"]).default("ai-lookup"),
      sourceField: z.string().min(1),
      outputFields: z.string().optional(),
      aiPrompt: z.string().optional(),
      apiUrl: z.string().optional(),
      fallbackBehavior: z.enum(["continue", "defaults", "error"]).default("continue"),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ enrichedData: z.record(z.any()), fieldsAdded: z.array(z.string()).optional() }),
  },
  {
    id: "document-generator",
    version: "1.0.0",
    name: "Document Generator",
    description: "Creates reports, contracts, or summaries from your workflow data.",
    icon: "FileOutput",
    category: "output",
    tags: ["document", "report", "contract", "generate", "enterprise"],
    configFields: [
      { key: "documentType", label: "Document Type", type: "select", required: true, defaultValue: "report", description: "What kind of document to create", options: [{ label: "Report", value: "report" }, { label: "Contract", value: "contract" }, { label: "Invoice", value: "invoice" }, { label: "Summary", value: "summary" }, { label: "Letter", value: "letter" }, { label: "Custom template", value: "custom" }] },
      { key: "title", label: "Document Title", type: "text", required: true, placeholder: "e.g. Monthly Sales Report", description: "Title of the document" },
      { key: "template", label: "Content Template", type: "textarea", rows: 8, required: true, placeholder: "Write your template here. Use {{variable}} to insert data.", description: "Document content — use {{variable}} for dynamic values" },
      { key: "outputFormat", label: "Output Format", type: "select", defaultValue: "pdf", description: "File format for the document", options: [{ label: "PDF", value: "pdf" }, { label: "Word (.docx)", value: "docx" }, { label: "Plain Text", value: "text" }, { label: "HTML", value: "html" }, { label: "Markdown", value: "markdown" }] },
      { key: "includeTimestamp", label: "Add Date/Time", type: "boolean", defaultValue: true, description: "Add the current date and time" },
      { key: "storeAsArtifact", label: "Save as Artifact", type: "boolean", defaultValue: true, description: "Store the document for download" },
    ],
    configSchema: z.object({
      documentType: z.enum(["report", "contract", "invoice", "summary", "letter", "custom"]).default("report"),
      title: z.string().min(1),
      template: z.string().min(1),
      outputFormat: z.enum(["pdf", "docx", "text", "html", "markdown"]).default("pdf"),
      includeTimestamp: z.boolean().default(true),
      storeAsArtifact: z.boolean().default(true),
    }),
    inputSchema: z.object({ payload: z.any() }),
    outputSchema: z.object({ documentUrl: z.string().optional(), artifactId: z.string().optional(), format: z.string() }),
  },
  {
    id: "form-input",
    version: "1.0.0",
    name: "Form Input",
    description: "Collects information from a person through a simple form before continuing.",
    icon: "ClipboardList",
    category: "input",
    tags: ["form", "input", "collect", "user", "enterprise"],
    configFields: [
      { key: "formTitle", label: "Form Title", type: "text", required: true, placeholder: "e.g. New Employee Information", description: "Title shown at the top of the form" },
      { key: "formDescription", label: "Instructions", type: "textarea", rows: 2, placeholder: "e.g. Please fill in the details below", description: "Brief instructions for the person" },
      { key: "fields", label: "Form Fields (JSON)", type: "json", rows: 8, required: true, defaultValue: [{ name: "full_name", label: "Full Name", type: "text", required: true }, { name: "email", label: "Email", type: "email", required: true }], description: "Define the fields — each needs a name, label, and type" },
      { key: "submitLabel", label: "Submit Button Text", type: "text", defaultValue: "Submit", description: "Text on the submit button" },
      { key: "notifyOnSubmit", label: "Notify on Submit", type: "boolean", defaultValue: false, description: "Send a notification when submitted" },
      { key: "timeoutMinutes", label: "Form Timeout (minutes)", type: "number", defaultValue: 1440, min: 5, max: 43200, description: "How long to wait for a response (1440 = 1 day)" },
    ],
    configSchema: z.object({
      formTitle: z.string().min(1),
      formDescription: z.string().optional(),
      fields: z.array(z.object({ name: z.string(), label: z.string(), type: z.string(), required: z.boolean().optional() })).min(1),
      submitLabel: z.string().default("Submit"),
      notifyOnSubmit: z.boolean().default(false),
      timeoutMinutes: z.number().int().min(5).max(43200).default(1440),
    }),
    inputSchema: z.object({ payload: z.any().optional() }),
    outputSchema: z.object({ formData: z.record(z.any()), submittedAt: z.string(), submittedBy: z.string().optional() }),
  },
];

const ComponentMap = new Map(Components.map((c) => [c.id, c]));

// ─── Alias resolver ──────────────────────────────────────────────
// Maps every known variant (UPPER_SNAKE, dot-notation, legacy names)
// to the canonical kebab-case catalog ID so that external callers,
// AI generators, and saved workflows all resolve correctly.
const COMPONENT_ALIASES: Record<string, string> = {};

function registerAliases(canonicalId: string, ...aliases: string[]) {
  for (const alias of aliases) {
    COMPONENT_ALIASES[alias] = canonicalId;
    COMPONENT_ALIASES[alias.toLowerCase()] = canonicalId;
    COMPONENT_ALIASES[alias.toUpperCase()] = canonicalId;
  }
}

// Auto-generate UPPER_SNAKE alias for every catalog component
for (const c of Components) {
  const upperSnake = c.id.toUpperCase().replace(/-/g, "_");
  COMPONENT_ALIASES[upperSnake] = c.id;
  COMPONENT_ALIASES[c.id] = c.id;
}

// Legacy / AI-generator keys → canonical catalog IDs
registerAliases("entry-point",
  "trigger.manual", "trigger.webhook", "trigger.event", "trigger.schedule",
  "WEBHOOK_TRIGGER", "SCHEDULE_TRIGGER", "FILE_UPLOAD_TRIGGER", "API_TRIGGER",
  "ENTRY_POINT", "entry_point",
);
registerAliases("email-send",
  "action.email", "tool.email", "EMAIL_SEND", "email_send", "send-email",
);
registerAliases("slack-send",
  "action.slack", "tool.slack", "SLACK_SEND", "slack_send", "send-slack",
);
registerAliases("http-request",
  "action.http", "tool.http", "HTTP_REQUEST", "http_request", "API_CALL", "api_call",
);
registerAliases("db-query",
  "action.database", "tool.database", "DB_QUERY", "db_query", "DB_WRITE", "db_write",
);
registerAliases("if-condition",
  "logic.if", "orchestrator.conditional", "IF_CONDITION", "if_condition",
);
registerAliases("switch-case",
  "logic.switch", "orchestrator.switch", "SWITCH_CASE", "switch_case",
);
registerAliases("loop",
  "logic.loop", "orchestrator.loop", "LOOP",
);
registerAliases("ai-agent",
  "agent", "ai.agent",
  "EXTRACTION_AGENT", "SUMMARIZATION_AGENT", "CLASSIFICATION_AGENT",
  "REASONING_AGENT", "DECISION_AGENT", "VERIFICATION_AGENT", "COMPLIANCE_AGENT",
  "AI_AGENT", "ai_agent",
);
registerAliases("text-transform",
  "ai.text", "TEXT_TRANSFORM", "text_transform",
);
registerAliases("delay",
  "control.delay", "DELAY",
);
registerAliases("error-handler",
  "control.error", "error_handling", "ERROR_HANDLER", "error_handler",
);
registerAliases("approval",
  "control.approval", "human.approval", "APPROVAL",
);
registerAliases("artifact-writer",
  "output.artifact", "ARTIFACT_WRITER", "artifact_writer",
);
registerAliases("webhook-response",
  "output.webhook", "WEBHOOK_RESPONSE", "webhook_response",
);
registerAliases("github",
  "tool.github", "integration.github", "GITHUB", "github_api", "GITHUB_API",
);
registerAliases("google-calendar",
  "google_calendar", "GOOGLE_CALENDAR", "tool.google.calendar", "calendar.google",
);
registerAliases("google-meet",
  "google_meet", "GOOGLE_MEET", "tool.google.meet", "meet.google",
);
registerAliases("google-docs",
  "google_docs", "GOOGLE_DOCS", "tool.google.docs", "docs.google",
);
registerAliases("google-sheets",
  "google_sheets", "GOOGLE_SHEETS", "tool.google.sheets", "sheets.google",
);
registerAliases("sla-monitor",
  "sla_monitor", "SLA_MONITOR", "control.sla", "sla",
);
registerAliases("audit-log",
  "audit_log", "AUDIT_LOG", "output.audit", "audit",
);
registerAliases("task-assigner",
  "task_assigner", "TASK_ASSIGNER", "control.task", "task_assign",
);
registerAliases("escalation",
  "ESCALATION", "control.escalation", "escalate",
);
registerAliases("data-enrichment",
  "data_enrichment", "DATA_ENRICHMENT", "ai.enrich", "enrich",
);
registerAliases("document-generator",
  "document_generator", "DOCUMENT_GENERATOR", "output.document", "doc_gen",
);
registerAliases("form-input",
  "form_input", "FORM_INPUT", "input.form", "form",
);

/**
 * Resolve any node-type variant to its canonical catalog ID.
 * Returns the canonical ID or `null` if completely unknown.
 */
export function resolveComponentId(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (ComponentMap.has(trimmed)) return trimmed;

  const alias = COMPONENT_ALIASES[trimmed] ?? COMPONENT_ALIASES[trimmed.toLowerCase()];
  if (alias && ComponentMap.has(alias)) return alias;

  const kebab = trimmed.toLowerCase().replace(/[_.]/g, "-");
  if (ComponentMap.has(kebab)) return kebab;

  return null;
}

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
  const resolved = resolveComponentId(componentId);
  const component = resolved ? getComponentById(resolved) : null;

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
    const rawId = (node.componentId || node.nodeType || "").trim();

    if (!rawId) {
      errors.push({
        nodeId,
        componentId: "",
        path: "componentId",
        message: "componentId (or nodeType) is required",
      });
      continue;
    }

    const canonicalId = resolveComponentId(rawId);

    if (!canonicalId) {
      errors.push({
        nodeId,
        componentId: rawId,
        path: "componentId",
        message: `Unknown component: "${rawId}". Could not resolve to any known catalog component.`,
      });
      continue;
    }

    const result = validateNodeConfig(canonicalId, node.config ?? {});
    if (!result.ok) {
      for (const e of result.errors) {
        errors.push({
          nodeId,
          componentId: canonicalId,
          path: e.path,
          message: e.message,
        });
      }
      continue;
    }

    normalized.push({
      id: nodeId,
      componentId: canonicalId,
      nodeType: canonicalId,
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

componentCatalogRouter.get("/resolve/:rawId", (req, res) => {
  const resolved = resolveComponentId(req.params.rawId);
  if (!resolved) {
    return res.status(404).json({ error: `Unknown component: "${req.params.rawId}"` });
  }
  const component = getComponentById(resolved);
  return res.json({ canonicalId: resolved, component: component ? toPublicComponent(component) : null });
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
