import { z } from "zod";

// Base node schema
export const BaseNodeSchema = z.object({
  node_id: z.string().min(1),
  node_type: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  timeout_ms: z.number().default(30000),
  retry_policy: z
    .object({
      retries: z.number().default(3),
      backoff: z
        .enum(["linear", "exponential", "fixed"])
        .default("exponential"),
      initial_delay_ms: z.number().default(1000),
      max_delay_ms: z.number().default(30000),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

export type BaseNode = z.infer<typeof BaseNodeSchema>;

// TRIGGER NODES
export const TriggerTypeEnum = z.enum([
  "webhook",
  "event",
  "schedule",
  "manual",
]);
export type TriggerType = z.infer<typeof TriggerTypeEnum>;

// Webhook Trigger
export const WebhookTriggerSchema = BaseNodeSchema.extend({
  node_type: z.literal("trigger.webhook"),
  trigger_type: z.literal("webhook"),
  endpoint_url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  auth_required: z.boolean().default(false),
  auth_type: z.enum(["bearer", "basic", "api_key", "oauth2"]).optional(),
  auth_token: z.string().optional(),
  headers_expected: z.record(z.string()).optional(),
  payload_schema: z.record(z.any()).optional(),
  verification_secret: z.string().optional(),
});

export type WebhookTrigger = z.infer<typeof WebhookTriggerSchema>;

// Event Trigger (Slack, etc.)
export const EventTriggerSchema = BaseNodeSchema.extend({
  node_type: z.literal("trigger.event"),
  trigger_type: z.literal("event"),
  platform: z.enum(["slack", "teams", "zoom", "github", "custom"]),
  connection_id: z.string().min(1),
  event_type: z.string().min(1),
  filters: z.record(z.any()).optional(),
  verification_token: z.string().optional(),
});

export type EventTrigger = z.infer<typeof EventTriggerSchema>;

// Schedule Trigger
export const ScheduleTriggerSchema = BaseNodeSchema.extend({
  node_type: z.literal("trigger.schedule"),
  trigger_type: z.literal("schedule"),
  cron_expression: z.string(),
  timezone: z.string().default("UTC"),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export type ScheduleTrigger = z.infer<typeof ScheduleTriggerSchema>;

// AGENT NODES
export const AgentTypeEnum = z.enum([
  "planner",
  "executor",
  "analyzer",
  "recovery",
]);
export type AgentType = z.infer<typeof AgentTypeEnum>;

export const ModelConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "azure", "local"]),
  api_key: z.string().optional(),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

export const MemoryConfigSchema = z.object({
  type: z.enum(["vector", "key_value", "conversation", "episodic"]),
  connection_id: z.string().optional(),
  embedding_api_key: z.string().optional(),
  embedding_model: z.string().optional(),
  max_entries: z.number().optional(),
  retention_days: z.number().optional(),
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

export const AgentNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("agent"),
  agent_type: AgentTypeEnum,
  goal: z.string().min(1),
  instructions: z.string().optional(),
  model_config: ModelConfigSchema,
  tools_allowed: z.array(z.string()),
  tool_connections: z.record(z.string()),
  memory: MemoryConfigSchema.optional(),
  execution: z.object({
    max_iterations: z.number().default(10),
    timeout: z.number().default(30000),
    stop_on_error: z.boolean().default(false),
  }),
  knowledge_base: z
    .object({
      enabled: z.boolean().default(false),
      documents: z.array(z.string()).optional(),
    })
    .optional(),
});

export type AgentNode = z.infer<typeof AgentNodeSchema>;

// TOOL/ACTION NODES
export const ToolTypeEnum = z.enum([
  "http",
  "database",
  "email",
  "slack",
  "browser",
  "custom",
]);
export type ToolType = z.infer<typeof ToolTypeEnum>;

// HTTP Tool Node
export const HttpToolNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("tool.http"),
  tool_type: z.literal("http"),
  connection_id: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string().min(1),
  headers: z.record(z.string()).optional(),
  query_params: z.record(z.any()).optional(),
  body: z.any().optional(),
  timeout: z.number().default(10000),
  response_format: z.enum(["json", "text", "xml", "binary"]).default("json"),
  validation: z
    .object({
      status_code: z.number().default(200),
      schema: z.record(z.any()).optional(),
    })
    .optional(),
});

export type HttpToolNode = z.infer<typeof HttpToolNodeSchema>;

// Database Tool Node
export const DatabaseToolNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("tool.database"),
  tool_type: z.literal("database"),
  connection_id: z.string().min(1),
  db_type: z.enum([
    "postgres",
    "mysql",
    "mongodb",
    "sqlite",
    "redis",
    "elasticsearch",
  ]),
  operation: z.enum([
    "select",
    "insert",
    "update",
    "delete",
    "execute",
    "batch",
  ]),
  query: z.string().optional(),
  table: z.string().optional(),
  data: z.any().optional(),
  parameters: z.record(z.any()).optional(),
  ssl: z.boolean().default(false),
  transaction: z.boolean().default(false),
});

export type DatabaseToolNode = z.infer<typeof DatabaseToolNodeSchema>;

// Email Tool Node
export const EmailToolNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("tool.email"),
  tool_type: z.literal("email"),
  provider: z.enum(["sendgrid", "ses", "mailgun", "smtp", "postmark"]),
  connection_id: z.string().min(1),
  from: z.string().email(),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string(),
  body: z.string(),
  body_type: z.enum(["text", "html", "markdown"]).default("html"),
  template_id: z.string().optional(),
  template_data: z.record(z.any()).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(), // base64 encoded
        content_type: z.string().optional(),
      }),
    )
    .optional(),
  tracking: z
    .object({
      opens: z.boolean().default(false),
      clicks: z.boolean().default(false),
    })
    .optional(),
});

export type EmailToolNode = z.infer<typeof EmailToolNodeSchema>;

// Slack/Teams Tool Node
export const SlackToolNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("tool.slack"),
  tool_type: z.literal("slack"),
  connection_id: z.string().min(1),
  channel: z.string().min(1),
  message: z.string(),
  blocks: z.array(z.any()).optional(),
  attachments: z.array(z.any()).optional(),
  thread_ts: z.string().optional(),
  reply_broadcast: z.boolean().default(false),
  username: z.string().optional(),
  icon_emoji: z.string().optional(),
  icon_url: z.string().url().optional(),
});

export type SlackToolNode = z.infer<typeof SlackToolNodeSchema>;

// Browser Automation Node
export const BrowserToolNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("tool.browser"),
  tool_type: z.literal("browser"),
  engine: z.enum(["playwright", "puppeteer", "selenium"]),
  url: z.string().url(),
  actions: z.array(
    z.object({
      type: z.enum([
        "click",
        "type",
        "select",
        "scroll",
        "wait",
        "navigate",
        "screenshot",
        "execute_script",
      ]),
      selector: z.string().optional(),
      value: z.any().optional(),
      timeout: z.number().optional(),
      wait_until: z
        .enum(["load", "domcontentloaded", "networkidle"])
        .optional(),
    }),
  ),
  headless: z.boolean().default(true),
  timeout: z.number().default(30000),
  viewport: z
    .object({
      width: z.number().default(1920),
      height: z.number().default(1080),
    })
    .optional(),
  screenshot: z.boolean().default(false),
  return_format: z.enum(["html", "text", "json", "screenshot"]).default("text"),
});

export type BrowserToolNode = z.infer<typeof BrowserToolNodeSchema>;

// ORCHESTRATOR NODES
export const OrchestratorTypeEnum = z.enum([
  "conditional",
  "parallel",
  "sequence",
  "loop",
  "switch",
  "fork",
]);
export type OrchestratorType = z.infer<typeof OrchestratorTypeEnum>;

export const ConditionalNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("orchestrator.conditional"),
  type: z.literal("conditional"),
  condition: z.string(), // can be JS expression or reference to input
  evaluation_mode: z.enum(["javascript", "python", "ai"]).default("javascript"),
  ai_config: ModelConfigSchema.optional(),
  true_branch: z.string(), // node_id
  false_branch: z.string(), // node_id
  variables: z.record(z.any()).optional(),
});

export type ConditionalNode = z.infer<typeof ConditionalNodeSchema>;

export const ParallelNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("orchestrator.parallel"),
  type: z.literal("parallel"),
  branches: z.array(z.string()), // array of node_ids
  wait_for_all: z.boolean().default(true),
  max_concurrency: z.number().default(5),
  on_error: z.enum(["stop_all", "continue", "fail_fast"]).default("stop_all"),
});

export type ParallelNode = z.infer<typeof ParallelNodeSchema>;

export const LoopNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("orchestrator.loop"),
  type: z.literal("loop"),
  loop_type: z.enum(["for", "while", "foreach", "do_while"]),
  iterations: z.number().optional(),
  loop_over: z.string().optional(), // array path
  condition: z.string().optional(),
  break_condition: z.string().optional(),
  max_iterations: z.number().default(100),
  body_node: z.string(), // node_id to execute in loop
  collect_results: z.boolean().default(true),
});

export type LoopNode = z.infer<typeof LoopNodeSchema>;

export const SwitchNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("orchestrator.switch"),
  type: z.literal("switch"),
  value_expression: z.string(),
  cases: z.array(
    z.object({
      condition: z.string(),
      branch: z.string(), // node_id
    }),
  ),
  default_branch: z.string(), // node_id
});

export type SwitchNode = z.infer<typeof SwitchNodeSchema>;

// VALIDATION NODES
export const ValidationTypeEnum = z.enum([
  "schema",
  "ai",
  "business_rule",
  "custom",
]);
export type ValidationType = z.infer<typeof ValidationTypeEnum>;

export const ValidationNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("validation"),
  validation_type: ValidationTypeEnum,
  rules: z.union([z.string(), z.array(z.any()), z.record(z.any())]),
  ai_config: ModelConfigSchema.optional(),
  schema: z.record(z.any()).optional(),
  confidence_threshold: z.number().min(0).max(1).default(0.8),
  on_fail: z.enum(["stop", "retry", "continue", "fallback"]),
  fallback_node: z.string().optional(),
  error_message: z.string().optional(),
});

export type ValidationNode = z.infer<typeof ValidationNodeSchema>;

// ERROR HANDLING NODES
export const ErrorHandlingNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("error_handling"),
  error_type: z.enum([
    "api_failure",
    "timeout",
    "validation",
    "exception",
    "all",
  ]),
  retry_policy: z.object({
    retries: z.number().default(5),
    backoff: z.enum(["linear", "exponential", "fixed"]).default("exponential"),
    initial_delay_ms: z.number().default(1000),
  }),
  fallback: z.object({
    type: z.enum(["node", "agent", "default_value", "skip"]),
    target: z.string().optional(),
    value: z.any().optional(),
  }),
  alert: z
    .object({
      enabled: z.boolean().default(false),
      type: z.enum(["slack", "email", "teams", "webhook", "pagerduty"]),
      connection_id: z.string().optional(),
      channel: z.string().optional(),
      recipients: z.array(z.string()).optional(),
      message: z.string().optional(),
    })
    .optional(),
  log_error: z.boolean().default(true),
  error_context: z.array(z.string()).optional(), // what data to include in error context
});

export type ErrorHandlingNode = z.infer<typeof ErrorHandlingNodeSchema>;

// WORKFLOW MONITOR NODE
export const WorkflowMonitorNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("monitor.workflow"),
  sla: z
    .object({
      max_duration_ms: z.number(),
      warning_threshold_ms: z.number().optional(),
    })
    .optional(),
  metrics: z.array(
    z.enum(["latency", "error_rate", "cost", "throughput", "success_rate"]),
  ),
  alerting: z.object({
    enabled: z.boolean().default(true),
    slack_connection_id: z.string().optional(),
    slack_channel: z.string().optional(),
    email_recipients: z.array(z.string().email()).optional(),
    webhook_url: z.string().url().optional(),
  }),
  prediction: z
    .object({
      enabled: z.boolean().default(false),
      model_api_key: z.string().optional(),
      prediction_types: z
        .array(z.enum(["latency", "errors", "cost"]))
        .optional(),
    })
    .optional(),
  dashboards: z
    .array(
      z.object({
        type: z.enum(["grafana", "datadog", "custom"]),
        url: z.string().url(),
        panel_id: z.string().optional(),
      }),
    )
    .optional(),
});

export type WorkflowMonitorNode = z.infer<typeof WorkflowMonitorNodeSchema>;

// AUDIT LOG NODE
export const AuditLogNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("audit.log"),
  log_level: z.enum(["minimal", "standard", "full", "debug"]),
  storage: z.object({
    type: z.enum(["s3", "database", "elasticsearch", "file", "custom"]),
    connection_id: z.string().optional(),
    bucket: z.string().optional(),
    database_table: z.string().optional(),
    index: z.string().optional(),
    file_path: z.string().optional(),
  }),
  include: z
    .array(
      z.enum([
        "inputs",
        "outputs",
        "agent_decisions",
        "tool_calls",
        "errors",
        "timing",
        "metadata",
      ]),
    )
    .default(["inputs", "outputs", "errors"]),
  anonymize: z.boolean().default(false),
  retention_days: z.number().default(90),
  compression: z.boolean().default(true),
  trace_id: z.string().optional(),
});

export type AuditLogNode = z.infer<typeof AuditLogNodeSchema>;

// MEMORY NODE
export const MemoryTypeEnum = z.enum([
  "vector",
  "key_value",
  "conversation",
  "episodic",
  "semantic",
]);
export type MemoryType = z.infer<typeof MemoryTypeEnum>;

export const MemoryNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("memory"),
  memory_type: MemoryTypeEnum,
  operation: z.enum(["store", "retrieve", "search", "delete", "update"]),
  provider: z.enum([
    "pinecone",
    "weaviate",
    "chromadb",
    "milvus",
    "redis",
    "custom",
  ]),
  connection_id: z.string().optional(),
  api_key: z.string().optional(),
  environment: z.string().optional(),
  index: z.string(),
  embedding_model: z.string().optional(),
  data: z
    .object({
      text: z.string().optional(),
      vector: z.array(z.number()).optional(),
      metadata: z.record(z.any()).optional(),
      id: z.string().optional(),
    })
    .optional(),
  search_config: z
    .object({
      query: z.string().optional(),
      top_k: z.number().default(5),
      filter: z.record(z.any()).optional(),
      score_threshold: z.number().default(0.7),
    })
    .optional(),
});

export type MemoryNode = z.infer<typeof MemoryNodeSchema>;

// HUMAN APPROVAL NODE
export const HumanApprovalNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("human.approval"),
  type: z.literal("approval"),
  assigned_to: z.union([z.string().email(), z.array(z.string().email())]),
  ui_form: z.object({
    fields: z.array(
      z.object({
        name: z.string(),
        type: z.enum([
          "text",
          "textarea",
          "select",
          "checkbox",
          "radio",
          "date",
        ]),
        label: z.string(),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
        default_value: z.any().optional(),
      }),
    ),
    title: z.string(),
    description: z.string().optional(),
  }),
  context: z.record(z.any()).optional(), // data to show to approver
  timeout: z.number().default(86400), // 24 hours default
  fallback: z
    .enum(["auto_approve", "auto_reject", "escalate", "retry"])
    .default("auto_reject"),
  fallback_node: z.string().optional(),
  notification: z
    .object({
      enabled: z.boolean().default(true),
      slack_connection_id: z.string().optional(),
      slack_channel: z.string().optional(),
      email: z.boolean().default(true),
      in_app: z.boolean().default(true),
    })
    .optional(),
  approval_history: z
    .array(
      z.object({
        approver: z.string(),
        decision: z.enum(["approved", "rejected", "escalated"]),
        timestamp: z.string().datetime(),
        comments: z.string().optional(),
      }),
    )
    .optional(),
});

export type HumanApprovalNode = z.infer<typeof HumanApprovalNodeSchema>;

// MEETING INTELLIGENCE NODE
export const MeetingIntelligenceNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("meeting.intelligence"),
  input_source: z.enum(["zoom", "teams", "meet", "custom"]),
  connection_id: z.string().optional(),
  meeting_id: z.string().optional(),
  api_key: z.string().optional(),
  transcription_model: z.enum(["whisper", "google", "azure", "custom"]),
  llm_api_key: z.string().optional(),
  llm_model: z.string().optional(),
  task_extraction: z.boolean().default(true),
  summary_generation: z.boolean().default(true),
  action_item_detection: z.boolean().default(true),
  sentiment_analysis: z.boolean().default(false),
  output_integrations: z.object({
    jira: z
      .object({
        connection_id: z.string().optional(),
        project_key: z.string().optional(),
      })
      .optional(),
    notion: z
      .object({
        connection_id: z.string().optional(),
        database_id: z.string().optional(),
      })
      .optional(),
    slack: z
      .object({
        connection_id: z.string().optional(),
        channel: z.string().optional(),
      })
      .optional(),
    email: z
      .object({
        recipients: z.array(z.string().email()).optional(),
        subject: z.string().optional(),
      })
      .optional(),
  }),
  language: z.string().default("en"),
  timestamp_range: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
});

export type MeetingIntelligenceNode = z.infer<
  typeof MeetingIntelligenceNodeSchema
>;

// Union type for all nodes
export const AnyNodeSchema = z.discriminatedUnion("node_type", [
  WebhookTriggerSchema,
  EventTriggerSchema,
  ScheduleTriggerSchema,
  AgentNodeSchema,
  HttpToolNodeSchema,
  DatabaseToolNodeSchema,
  EmailToolNodeSchema,
  SlackToolNodeSchema,
  BrowserToolNodeSchema,
  ConditionalNodeSchema,
  ParallelNodeSchema,
  LoopNodeSchema,
  SwitchNodeSchema,
  ValidationNodeSchema,
  ErrorHandlingNodeSchema,
  WorkflowMonitorNodeSchema,
  AuditLogNodeSchema,
  MemoryNodeSchema,
  HumanApprovalNodeSchema,
  MeetingIntelligenceNodeSchema,
]);

export type AnyNode = z.infer<typeof AnyNodeSchema>;

// Node execution result
export const NodeExecutionResultSchema = z.object({
  node_id: z.string(),
  status: z.enum(["success", "error", "pending", "skipped", "timeout"]),
  output: z.any().optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      details: z.any().optional(),
    })
    .optional(),
  execution_time_ms: z.number(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  retry_count: z.number().default(0),
  metadata: z.record(z.any()).optional(),
});

export type NodeExecutionResult = z.infer<typeof NodeExecutionResultSchema>;

// Node execution context
export const NodeExecutionContextSchema = z.object({
  workflow_id: z.string(),
  execution_id: z.string(),
  node_id: z.string(),
  input_data: z.record(z.any()),
  variables: z.record(z.any()).optional(),
  previous_results: z.record(z.any()).optional(),
  workflow_state: z.record(z.any()).optional(),
  environment: z.enum(["dev", "staging", "prod"]).optional(),
  user_context: z
    .object({
      user_id: z.string().optional(),
      role: z.string().optional(),
      permissions: z.array(z.string()).optional(),
    })
    .optional(),
});

export type NodeExecutionContext = z.infer<typeof NodeExecutionContextSchema>;
