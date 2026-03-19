import { z } from "zod";
import { AnyNodeSchema, NodeExecutionResultSchema } from "./nodes";

// Workflow status types
export const WorkflowStatusEnum = z.enum([
  "draft",
  "active",
  "paused",
  "archived",
  "error",
  "completed",
  "running",
]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusEnum>;

// Execution status types
export const ExecutionStatusEnum = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "timeout",
  "retrying",
]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusEnum>;

// Priority types
export const PriorityEnum = z.enum(["low", "normal", "high", "critical"]);
export type Priority = z.infer<typeof PriorityEnum>;

// Workflow schema
export const WorkflowSchema = z.object({
  workflow_id: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  version: z.number().default(1),
  status: WorkflowStatusEnum.default("draft"),

  // Workflow structure
  nodes: z.array(AnyNodeSchema),
  edges: z.array(
    z.object({
      id: z.string(),
      source_node_id: z.string(),
      target_node_id: z.string(),
      condition: z.string().optional(),
      label: z.string().optional(),
    }),
  ),

  // Workflow configuration
  start_node_id: z.string().min(1),
  end_node_ids: z.array(z.string()).optional(),

  // Scheduling and triggers
  trigger_config: z
    .object({
      type: z.enum(["manual", "webhook", "schedule", "event"]),
      schedule_expression: z.string().optional(),
      webhook_url: z.string().url().optional(),
      event_source: z.string().optional(),
    })
    .optional(),

  // Environment and contexts
  environment: z.enum(["dev", "staging", "prod"]).default("dev"),
  default_timeout_ms: z.number().default(300000), // 5 minutes default

  // Variables and secrets
  variables: z.record(z.any()).optional(),
  secrets: z.record(z.string()).optional(),

  // Metadata
  created_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  updated_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  created_by: z.string().optional(),
  updated_by: z.string().optional(),

  // Organization and team
  organization_id: z.string().optional(),
  team_id: z.string().optional(),

  // Tags and categorization
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),

  // RBAC
  permissions: z
    .object({
      view: z.array(z.string()).default([]),
      edit: z.array(z.string()).default([]),
      execute: z.array(z.string()).default([]),
      delete: z.array(z.string()).default([]),
    })
    .optional(),

  // Monitoring and alerts
  monitoring: z
    .object({
      enabled: z.boolean().default(true),
      alert_on_failure: z.boolean().default(true),
      alert_on_timeout: z.boolean().default(false),
      sla_duration_ms: z.number().optional(),
      metrics: z
        .array(
          z.enum([
            "execution_time",
            "success_rate",
            "error_count",
            "throughput",
          ]),
        )
        .default(["execution_time", "success_rate"]),
    })
    .optional(),

  // Version control
  version_description: z.string().optional(),
  parent_version: z.number().optional(),
  is_latest: z.boolean().default(true),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// Workflow creation schema
export const CreateWorkflowSchema = WorkflowSchema.partial({
  workflow_id: true,
  version: true,
  status: true,
  created_at: true,
  updated_at: true,
  is_latest: true,
}).required({
  name: true,
  nodes: true,
  edges: true,
  start_node_id: true,
});

export type CreateWorkflow = z.infer<typeof CreateWorkflowSchema>;

// Workflow update schema
export const UpdateWorkflowSchema = WorkflowSchema.partial().extend({
  workflow_id: z.string().min(1),
});

export type UpdateWorkflow = z.infer<typeof UpdateWorkflowSchema>;

// Workflow execution schema
export const WorkflowExecutionSchema = z.object({
  execution_id: z.string().min(1),
  workflow_id: z.string().min(1),
  workflow_version: z.number(),
  status: ExecutionStatusEnum.default("pending"),

  // Execution context
  input_data: z.record(z.any()).optional(),
  output_data: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional(),

  // Execution details
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  duration_ms: z.number().optional(),

  // Node execution results
  node_results: z.array(NodeExecutionResultSchema).optional(),

  // Current state
  current_node_id: z.string().optional(),
  completed_nodes: z.array(z.string()).default([]),
  failed_nodes: z.array(z.string()).default([]),

  // Error handling
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      node_id: z.string().optional(),
      details: z.any().optional(),
    })
    .optional(),

  // Priority and scheduling
  priority: PriorityEnum.default("normal"),
  queue_position: z.number().optional(),
  scheduled_at: z.string().datetime().optional(),

  // User context
  triggered_by: z.string().optional(),
  trigger_type: z
    .enum(["manual", "webhook", "schedule", "event", "api"])
    .optional(),
  trigger_metadata: z.record(z.any()).optional(),

  // Environment
  environment: z.enum(["dev", "staging", "prod"]).default("dev"),

  // Retries
  retry_count: z.number().default(0),
  max_retries: z.number().default(3),

  // Metadata
  trace_id: z.string().optional(),
  correlation_id: z.string().optional(),
  parent_execution_id: z.string().optional(),

  // Additional context
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;

// Workflow execution creation schema
export const CreateWorkflowExecutionSchema = WorkflowExecutionSchema.partial({
  execution_id: true,
  status: true,
  started_at: true,
  completed_at: true,
  duration_ms: true,
  node_results: true,
  error: true,
  retry_count: true,
  trace_id: true,
  correlation_id: true,
}).required({
  workflow_id: true,
});

export type CreateWorkflowExecution = z.infer<
  typeof CreateWorkflowExecutionSchema
>;

// Workflow statistics schema
export const WorkflowStatsSchema = z.object({
  workflow_id: z.string(),
  total_executions: z.number(),
  successful_executions: z.number(),
  failed_executions: z.number(),
  avg_duration_ms: z.number(),
  success_rate: z.number(), // 0-1
  last_execution_at: z.string().datetime().optional(),
  last_execution_status: ExecutionStatusEnum.optional(),
  error_rate: z.number(), // 0-1

  // Time-based stats
  stats_today: z
    .object({
      executions: z.number(),
      successes: z.number(),
      failures: z.number(),
      avg_duration: z.number(),
    })
    .optional(),

  stats_week: z
    .object({
      executions: z.number(),
      successes: z.number(),
      failures: z.number(),
      avg_duration: z.number(),
    })
    .optional(),

  stats_month: z
    .object({
      executions: z.number(),
      successes: z.number(),
      failures: z.number(),
      avg_duration: z.number(),
    })
    .optional(),
});

export type WorkflowStats = z.infer<typeof WorkflowStatsSchema>;

// Workflow log schema
export const WorkflowLogSchema = z.object({
  log_id: z.string().min(1),
  execution_id: z.string(),
  workflow_id: z.string(),
  node_id: z.string().optional(),
  level: z.enum(["debug", "info", "warn", "error", "fatal"]),
  message: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
  stack_trace: z.string().optional(),
  context: z.record(z.any()).optional(),
});

export type WorkflowLog = z.infer<typeof WorkflowLogSchema>;

// Workflow schedule schema
export const WorkflowScheduleSchema = z.object({
  schedule_id: z.string().min(1),
  workflow_id: z.string(),
  workflow_version: z.number(),
  cron_expression: z.string(),
  timezone: z.string().default("UTC"),
  enabled: z.boolean().default(true),

  // Schedule configuration
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  max_runs: z.number().optional(),
  run_count: z.number().default(0),

  // Execution configuration
  priority: PriorityEnum.default("normal"),
  timeout_ms: z.number().default(300000),

  // Notification
  notify_on_success: z.boolean().default(false),
  notify_on_failure: z.boolean().default(true),
  notification_recipients: z.array(z.string().email()).optional(),

  // Metadata
  created_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  updated_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  created_by: z.string().optional(),
  next_run_at: z.string().datetime().optional(),
  last_run_at: z.string().datetime().optional(),
  last_run_status: ExecutionStatusEnum.optional(),

  // Additional context
  input_data: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

export type WorkflowSchedule = z.infer<typeof WorkflowScheduleSchema>;

// Workflow webhook schema
export const WorkflowWebhookSchema = z.object({
  webhook_id: z.string().min(1),
  workflow_id: z.string(),
  webhook_url: z.string().url(),
  secret: z.string().optional(),

  // Security
  auth_type: z
    .enum(["none", "bearer", "basic", "api_key", "oauth2"])
    .default("none"),
  auth_config: z.record(z.any()).optional(),

  // Validation
  validate_signature: z.boolean().default(false),
  signature_header: z.string().default("X-Signature"),
  signature_algorithm: z
    .enum(["hmac_sha256", "rsa_sha256"])
    .default("hmac_sha256"),

  // Configuration
  enabled: z.boolean().default(true),
  rate_limit: z
    .object({
      enabled: z.boolean().default(false),
      max_requests: z.number().default(100),
      window_minutes: z.number().default(60),
    })
    .optional(),

  // Response
  response_on_success: z
    .object({
      status: z.number().default(200),
      body: z.any().default({ success: true }),
    })
    .optional(),
  response_on_error: z
    .object({
      status: z.number().default(500),
      body: z.any().default({ success: false, error: "Internal server error" }),
    })
    .optional(),

  // Metadata
  created_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  updated_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  last_triggered_at: z.string().datetime().optional(),
  trigger_count: z.number().default(0),

  // Filters
  headers_filter: z.record(z.string()).optional(),
  payload_filter: z.record(z.any()).optional(),
});

export type WorkflowWebhook = z.infer<typeof WorkflowWebhookSchema>;

// Workflow deployment schema
export const WorkflowDeploymentSchema = z.object({
  deployment_id: z.string().min(1),
  workflow_id: z.string(),
  workflow_version: z.number(),
  environment: z.enum(["dev", "staging", "prod"]),

  // Deployment status
  status: z
    .enum(["pending", "deploying", "deployed", "failed", "rolling_back"])
    .default("pending"),

  // Configuration
  deployed_at: z.string().datetime().optional(),
  deployed_by: z.string().optional(),

  // Rollback
  previous_version: z.number().optional(),
  rollback_enabled: z.boolean().default(true),
  rollback_at: z.string().datetime().optional(),

  // Validation
  validation_required: z.boolean().default(true),
  validation_status: z.enum(["pending", "passed", "failed"]).optional(),
  validation_results: z.record(z.any()).optional(),

  // Metadata
  created_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  updated_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  notes: z.string().optional(),
  changelog: z.string().optional(),
});

export type WorkflowDeployment = z.infer<typeof WorkflowDeploymentSchema>;

// Workflow template schema
export const WorkflowTemplateSchema = z.object({
  template_id: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: z.string().optional(),

  // Template content
  template: WorkflowSchema.partial({
    workflow_id: true,
    created_at: true,
    updated_at: true,
  }),

  // Template configuration
  variables: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["string", "number", "boolean", "object", "array"]),
        description: z.string().optional(),
        default_value: z.any().optional(),
        required: z.boolean().default(false),
        options: z.array(z.any()).optional(),
      }),
    )
    .optional(),

  // Template metadata
  created_by: z.string().optional(),
  created_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  updated_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),

  // Usage tracking
  usage_count: z.number().default(0),
  is_public: z.boolean().default(false),
  tags: z.array(z.string()).optional(),

  // Ratings and reviews
  rating: z.number().min(0).max(5).optional(),
  review_count: z.number().default(0),
  featured: z.boolean().default(false),
});

export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

// Workflow import/export schema
export const WorkflowImportSchema = z.object({
  workflow: WorkflowSchema,
  connections: z.array(z.any()).optional(), // Connection references
  dependencies: z.array(z.string()).optional(),
  version: z.string().default("1.0.0"),
  exported_at: z.string().datetime(),
  exported_by: z.string().optional(),
});

export type WorkflowImport = z.infer<typeof WorkflowImportSchema>;

// Workflow export schema
export const WorkflowExportSchema = WorkflowImportSchema.extend({
  include_secrets: z.boolean().default(false),
  include_execution_history: z.boolean().default(false),
  include_metrics: z.boolean().default(true),
});

export type WorkflowExport = z.infer<typeof WorkflowExportSchema>;

// Workflow test schema
export const WorkflowTestSchema = z.object({
  test_id: z.string().min(1),
  workflow_id: z.string(),
  workflow_version: z.number(),
  name: z.string().min(1),

  // Test configuration
  input_data: z.record(z.any()),
  expected_output: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional(),

  // Test assertions
  assertions: z.array(
    z.object({
      path: z.string(), // JSONPath to value
      operator: z.enum([
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "greater_than",
        "less_than",
        "exists",
        "not_exists",
      ]),
      expected_value: z.any(),
      description: z.string().optional(),
    }),
  ),

  // Test metadata
  created_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  created_by: z.string().optional(),
  last_run_at: z.string().datetime().optional(),
  last_run_status: z.enum(["passed", "failed", "skipped"]).optional(),

  // Test configuration
  enabled: z.boolean().default(true),
  timeout_ms: z.number().default(60000),
  priority: PriorityEnum.default("normal"),
});

export type WorkflowTest = z.infer<typeof WorkflowTestSchema>;

// Batch execution schema
export const BatchExecutionSchema = z.object({
  batch_id: z.string().min(1),
  workflow_id: z.string(),
  workflow_version: z.number(),

  // Batch configuration
  input_data: z.array(z.record(z.any())),
  execution_config: z
    .object({
      concurrency: z.number().default(5),
      continue_on_error: z.boolean().default(false),
      delay_between_runs_ms: z.number().default(0),
    })
    .optional(),

  // Batch execution status
  status: z
    .enum(["pending", "running", "completed", "failed", "cancelled"])
    .default("pending"),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),

  // Results
  execution_ids: z.array(z.string()).default([]),
  successful_executions: z.number().default(0),
  failed_executions: z.number().default(0),

  // Error handling
  on_failure: z.enum(["stop", "continue", "rollback"]).default("stop"),

  // Metadata
  created_by: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type BatchExecution = z.infer<typeof BatchExecutionSchema>;
