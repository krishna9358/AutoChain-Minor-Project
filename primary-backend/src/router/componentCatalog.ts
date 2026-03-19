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
  {
    id: "entry-point",
    version: "1.0.0",
    name: "Entry Point",
    description: "Starts a workflow via webhook, API call, schedule, or manual input.",
    icon: "Play",
    category: "input",
    tags: ["trigger", "start", "entry"],
    configFields: [
      {
        key: "triggerMode",
        label: "Trigger Mode",
        type: "select",
        required: true,
        defaultValue: "manual",
        options: [
          { label: "Manual", value: "manual" },
          { label: "Webhook", value: "webhook" },
          { label: "Schedule", value: "schedule" },
          { label: "API", value: "api" },
        ],
      },
      {
        key: "webhookPath",
        label: "Webhook Path",
        type: "text",
        placeholder: "/incoming/orders",
      },
      {
        key: "cron",
        label: "Cron Expression",
        type: "text",
        placeholder: "0 * * * *",
      },
      {
        key: "inputSchema",
        label: "Input Schema (JSON)",
        type: "json",
        rows: 5,
        defaultValue: {},
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
            message: "cron is required when triggerMode is schedule",
          });
        }
      }),
    outputSchema: z.object({
      payload: z.any(),
      metadata: z.record(z.any()).optional(),
    }),
  },
  {
    id: "http-request",
    version: "1.0.0",
    name: "HTTP Request",
    description: "Performs an outbound HTTP request to an external API.",
    icon: "Globe",
    category: "integration",
    tags: ["api", "rest", "http"],
    configFields: [
      {
        key: "method",
        label: "Method",
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
      { key: "url", label: "URL", type: "url", required: true, placeholder: "https://api.example.com/items" },
      { key: "headers", label: "Headers (JSON)", type: "json", rows: 4, defaultValue: {} },
      { key: "query", label: "Query Params (JSON)", type: "json", rows: 4, defaultValue: {} },
      { key: "body", label: "Body (JSON)", type: "json", rows: 5, defaultValue: {} },
      { key: "timeoutMs", label: "Timeout (ms)", type: "number", defaultValue: 15000, min: 1000, max: 120000 },
      { key: "retryCount", label: "Retries", type: "number", defaultValue: 1, min: 0, max: 10 },
    ],
    configSchema: z.object({
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
      url: z.string().url(),
      headers: JsonRecordSchema.optional().default({}),
      query: JsonRecordSchema.optional().default({}),
      body: z.any().optional(),
      timeoutMs: z.number().int().min(1000).max(120000).default(15000),
      retryCount: z.number().int().min(0).max(10).default(1),
    }),
    inputSchema: z.object({
      payload: z.any().optional(),
      context: z.record(z.any()).optional(),
    }),
    outputSchema: z.object({
      status: z.number(),
      headers: z.record(z.any()).optional(),
      data: z.any().optional(),
    }),
  },
  {
    id: "if-condition",
    version: "1.0.0",
    name: "If Condition",
    description: "Branches flow based on a condition expression.",
    icon: "GitBranch",
    category: "logic",
    tags: ["branch", "condition"],
    configFields: [
      {
        key: "leftPath",
        label: "Left Value Path",
        type: "text",
        required: true,
        placeholder: "payload.customer.tier",
      },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        required: true,
        defaultValue: "equals",
        options: [
          { label: "Equals", value: "equals" },
          { label: "Not Equals", value: "not_equals" },
          { label: "Contains", value: "contains" },
          { label: "Greater Than", value: "gt" },
          { label: "Less Than", value: "lt" },
          { label: "Exists", value: "exists" },
        ],
      },
      { key: "rightValue", label: "Right Value", type: "text", placeholder: "enterprise" },
    ],
    configSchema: z.object({
      leftPath: z.string().min(1),
      operator: z.enum(["equals", "not_equals", "contains", "gt", "lt", "exists"]),
      rightValue: z.any().optional(),
    }),
    inputSchema: z.object({
      payload: z.any(),
    }),
    outputSchema: z.object({
      result: z.boolean(),
      payload: z.any().optional(),
    }),
  },
  {
    id: "delay",
    version: "1.0.0",
    name: "Delay",
    description: "Pauses execution for a fixed duration.",
    icon: "Clock",
    category: "control",
    tags: ["wait", "sleep"],
    configFields: [
      {
        key: "durationMs",
        label: "Duration (ms)",
        type: "number",
        required: true,
        defaultValue: 5000,
        min: 1,
        max: 3600000,
      },
    ],
    configSchema: z.object({
      durationMs: z.number().int().min(1).max(3600000),
    }),
    inputSchema: z.object({
      payload: z.any().optional(),
    }),
    outputSchema: z.object({
      payload: z.any().optional(),
      delayedMs: z.number(),
    }),
  },
  {
    id: "artifact-writer",
    version: "1.0.0",
    name: "Artifact Writer",
    description: "Stores execution output as an artifact.",
    icon: "Archive",
    category: "output",
    tags: ["storage", "artifact", "result"],
    configFields: [
      { key: "name", label: "Artifact Name", type: "text", required: true, placeholder: "run-summary.json" },
      {
        key: "format",
        label: "Format",
        type: "select",
        required: true,
        defaultValue: "json",
        options: [
          { label: "JSON", value: "json" },
          { label: "Text", value: "text" },
          { label: "Markdown", value: "markdown" },
        ],
      },
      { key: "public", label: "Public Artifact", type: "boolean", defaultValue: false },
    ],
    configSchema: z.object({
      name: z.string().min(1),
      format: z.enum(["json", "text", "markdown"]).default("json"),
      public: z.boolean().default(false),
    }),
    inputSchema: z.object({
      payload: z.any(),
    }),
    outputSchema: z.object({
      artifactId: z.string(),
      url: z.string().optional(),
      size: z.number().optional(),
    }),
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
      ok: true as const,
      value: config ?? {},
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
