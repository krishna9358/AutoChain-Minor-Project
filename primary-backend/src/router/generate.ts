import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import {
  getComponentById,
  getComponentCatalog,
  validateNodeConfig,
} from "./componentCatalog";
import OpenAI from "openai";

const router = Router();

// AI Workflow Generator
router.post("/workflow", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Simulate AI generation pipeline
    // In production, integrate with OpenAI/Claude/Gemini
    const generated = await generateWorkflowFromPrompt(prompt);

    res.json(generated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

interface GeneratedNode {
  tempId: string;
  componentId: string;
  nodeType: string;
  category: string;
  label: string;
  description: string;
  config: any;
  position: { x: number; y: number };
}

function catalogNode(
  tempId: string,
  componentId: string,
  label: string,
  description: string,
  config: any,
  position: { x: number; y: number },
): GeneratedNode {
  const def = getComponentById(componentId);
  return {
    tempId,
    componentId,
    nodeType: componentId,
    category: def?.category ?? "core",
    label,
    description,
    config,
    position,
  };
}

interface GeneratedEdge {
  source: string;
  target: string;
  label?: string;
}

interface LlmWorkflowNodeDraft {
  tempId?: string;
  componentId?: string;
  label?: string;
  description?: string;
  config?: Record<string, unknown>;
  position?: { x?: number; y?: number };
}

interface LlmWorkflowDraft {
  name?: string;
  description?: string;
  nodes?: LlmWorkflowNodeDraft[];
  edges?: Array<{ source?: string; target?: string; label?: string }>;
}

// --- Provider configuration ---
type LlmProvider = "groq" | "openrouter";

interface ProviderConfig {
  provider: LlmProvider;
  baseURL: string;
  apiKey: string;
  models: string[];
}

function getProviderConfigs(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  // Groq — primary (generous free tier, fast inference)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const groqFallbacks = (process.env.GROQ_FALLBACK_MODELS || "llama-3.1-8b-instant,gemma2-9b-it")
      .split(",").map((m) => m.trim()).filter(Boolean);
    configs.push({
      provider: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      models: Array.from(new Set([groqModel, ...groqFallbacks])),
    });
  }

  // OpenRouter — fallback
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    const orModel = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    const orFallbacks = (process.env.OPENROUTER_FALLBACK_MODELS || "meta-llama/llama-3.3-70b-instruct:free")
      .split(",").map((m) => m.trim()).filter(Boolean);
    configs.push({
      provider: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: orKey,
      models: Array.from(new Set([orModel, ...orFallbacks])),
    });
  }

  return configs;
}

const NODE_CONFIG_REPAIR_RETRIES = 2;

function extractJsonObject(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const inner = fencedMatch[1].trim();
    if (inner.startsWith("{") && inner.endsWith("}")) return inner;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("No JSON object found in LLM response");
}

function buildComponentPlanningContext(): string {
  const catalog = getComponentCatalog();
  const lines: string[] = [];
  lines.push("Component planning reference:");
  for (const component of catalog) {
    lines.push(
      `- ${component.id} (${component.category}): ${component.description}`,
    );
    for (const field of component.configFields) {
      const attrs: string[] = [field.type];
      if (field.required) attrs.push("required");
      if (field.defaultValue !== undefined) {
        attrs.push(`default=${JSON.stringify(field.defaultValue)}`);
      }
      if (field.showWhen) {
        attrs.push(
          `showWhen=${field.showWhen.field}:${JSON.stringify(field.showWhen.value)}`,
        );
      }
      if (field.options?.length) {
        const options = field.options
          .map((o) => o.value)
          .slice(0, 10)
          .join("|");
        attrs.push(`options=${options}`);
      }
      lines.push(
        `  - ${field.key} [${attrs.join(", ")}]${field.description ? ` - ${field.description}` : ""}`,
      );
    }
  }
  return lines.join("\n");
}

function normalizeLlmDraft(
  draft: LlmWorkflowDraft,
  prompt: string,
): { name: string; description: string; nodes: GeneratedNode[]; edges: GeneratedEdge[] } {
  const nodesDraft = Array.isArray(draft.nodes) ? draft.nodes : [];
  const normalizedNodes: GeneratedNode[] = [];
  const idMap = new Map<string, string>();

  for (let i = 0; i < nodesDraft.length; i += 1) {
    const node = nodesDraft[i];
    const componentId = String(node.componentId || "").trim();
    const def = componentId ? getComponentById(componentId) : null;
    if (!def) continue;

    const tempId = String(node.tempId || `node-${i + 1}`);
    idMap.set(tempId, tempId);

    const x = Number(node.position?.x);
    const y = Number(node.position?.y);
    normalizedNodes.push(
      catalogNode(
        tempId,
        componentId,
        String(node.label || def.name || componentId),
        String(node.description || def.description || "Generated by AI"),
        typeof node.config === "object" && node.config !== null ? node.config : {},
        {
          x: Number.isFinite(x) ? x : 300,
          y: Number.isFinite(y) ? y : 80 + i * 150,
        },
      ),
    );
  }

  if (normalizedNodes.length === 0) {
    throw new Error("LLM returned no valid nodes");
  }

  // Ensure there is exactly one entry point as graph start.
  const hasEntry = normalizedNodes.some((n) => n.componentId === "entry-point");
  if (!hasEntry) {
    normalizedNodes.unshift(
      catalogNode(
        "node-entry",
        "entry-point",
        "Entry Point",
        "Start trigger for generated workflow",
        { triggerMode: "manual" },
        { x: 300, y: 40 },
      ),
    );
    idMap.set("node-entry", "node-entry");
  }

  const rawEdges = Array.isArray(draft.edges) ? draft.edges : [];
  const normalizedEdges: GeneratedEdge[] = [];
  for (const edge of rawEdges) {
    const source = String(edge.source || "");
    const target = String(edge.target || "");
    if (!idMap.has(source) || !idMap.has(target) || source === target) continue;
    normalizedEdges.push({
      source,
      target,
      ...(edge.label ? { label: String(edge.label) } : {}),
    });
  }

  // If model omitted edges, connect sequentially.
  if (normalizedEdges.length === 0) {
    for (let i = 0; i < normalizedNodes.length - 1; i += 1) {
      normalizedEdges.push({
        source: normalizedNodes[i].tempId,
        target: normalizedNodes[i + 1].tempId,
      });
    }
  }

  return {
    name: String(draft.name || "AI Generated Workflow"),
    description: String(draft.description || `Generated from prompt: ${prompt}`),
    nodes: normalizedNodes,
    edges: normalizedEdges,
  };
}

const RATE_LIMIT_RETRIES = 2;
const RATE_LIMIT_BASE_DELAY_MS = 2000;

async function completeWithModelFallback(
  messages: Array<{ role: "system" | "user"; content: string }>,
): Promise<{ content: string; model: string; provider: LlmProvider }> {
  const providerConfigs = getProviderConfigs();
  if (providerConfigs.length === 0) {
    throw new Error("No LLM provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY.");
  }

  let lastError: unknown;
  for (const config of providerConfigs) {
    const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

    for (const model of config.models) {
      for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
        const startedAt = Date.now();
        try {
          console.info("[workflow-generate] Trying model", { provider: config.provider, model, attempt });
          const completion = await client.chat.completions.create({
            model,
            temperature: 0.2,
            messages,
          });
          const content = completion.choices[0]?.message?.content;
          if (!content) throw new Error(`LLM returned empty response for model ${model}`);
          console.info("[workflow-generate] Model succeeded", {
            provider: config.provider,
            model,
            latencyMs: Date.now() - startedAt,
          });
          return { content, model, provider: config.provider };
        } catch (error) {
          lastError = error;
          const maybe = error as {
            status?: number;
            error?: { message?: string };
            message?: string;
          };
          const status = maybe?.status;
          console.warn("[workflow-generate] Model failed", {
            provider: config.provider,
            model,
            attempt,
            latencyMs: Date.now() - startedAt,
            status,
            message: maybe?.error?.message || maybe?.message || String(error),
          });
          if (status === 429 && attempt < RATE_LIMIT_RETRIES) {
            const delay = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt);
            console.info("[workflow-generate] Rate limited, retrying after delay", { provider: config.provider, model, delayMs: delay });
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          break;
        }
      }
    }
    console.warn("[workflow-generate] All models exhausted for provider", { provider: config.provider });
  }

  throw new Error(
    `All LLM providers failed. Last error: ${
      (lastError as { message?: string })?.message || String(lastError)
    }`,
  );
}

async function repairNodeConfigWithLlm(
  node: GeneratedNode,
  errors: Array<{ path: string; message: string }>,
): Promise<Record<string, unknown> | null> {
  const def = getComponentById(node.componentId);
  if (!def) return null;

  const system = [
    "You repair workflow node configs.",
    "Return ONLY valid JSON object for config (no markdown).",
    "Use only known config keys and valid option values.",
  ].join("\n");

  const fieldContext = def.configFields
    .map(
      (f) =>
        `- ${f.key} [${f.type}${f.required ? ", required" : ""}${f.options?.length ? `, options=${f.options.map((o) => o.value).join("|")}` : ""}]`,
    )
    .join("\n");

  const user = [
    `Component: ${def.id} (${def.name})`,
    `Description: ${def.description}`,
    "Fields:",
    fieldContext,
    `Current config JSON: ${JSON.stringify(node.config ?? {}, null, 2)}`,
    `Validation errors: ${JSON.stringify(errors, null, 2)}`,
    "Return repaired config JSON only.",
  ].join("\n");

  try {
    const { content, model, provider } = await completeWithModelFallback([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const repairedJson = extractJsonObject(content);
    const parsed = JSON.parse(repairedJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Repair output was not a config object");
    }
    console.info("[workflow-generate] Repaired node config with LLM", {
      provider,
      model,
      componentId: def.id,
      nodeId: node.tempId,
    });
    return parsed as Record<string, unknown>;
  } catch (error) {
    console.warn("[workflow-generate] Node config repair failed", {
      componentId: def.id,
      nodeId: node.tempId,
      message: (error as { message?: string })?.message || String(error),
    });
    return null;
  }
}

async function validateAndRepairGeneratedWorkflow(
  workflow: { name: string; description: string; nodes: GeneratedNode[]; edges: GeneratedEdge[] },
): Promise<{ name: string; description: string; nodes: GeneratedNode[]; edges: GeneratedEdge[] }> {
  const repairedNodes: GeneratedNode[] = [];

  for (const node of workflow.nodes) {
    let currentConfig = (node.config ?? {}) as Record<string, unknown>;
    let validation = validateNodeConfig(node.componentId, currentConfig);
    let attempt = 0;

    while (!validation.ok && attempt < NODE_CONFIG_REPAIR_RETRIES) {
      const repaired = await repairNodeConfigWithLlm({ ...node, config: currentConfig }, validation.errors);
      if (!repaired) break;
      currentConfig = repaired;
      validation = validateNodeConfig(node.componentId, currentConfig);
      attempt += 1;
    }

    if (!validation.ok) {
      // If still invalid, keep original config so template fallback can still be used by caller.
      console.warn("[workflow-generate] Node config still invalid after repair attempts", {
        nodeId: node.tempId,
        componentId: node.componentId,
        errors: validation.errors,
      });
      repairedNodes.push(node);
      continue;
    }

    repairedNodes.push({
      ...node,
      config: validation.value,
    });
  }

  return {
    ...workflow,
    nodes: repairedNodes,
  };
}

async function generateWorkflowWithLlm(prompt: string): Promise<{
  name: string;
  description: string;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}> {
  const providerConfigs = getProviderConfigs();
  if (providerConfigs.length === 0) {
    throw new Error("No LLM provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY.");
  }

  const allowedComponents = getComponentCatalog().map((c) => c.id);
  const componentContext = buildComponentPlanningContext();
  const plannerGuardrails = [
    "Plan only with the listed components and field keys.",
    "Pick minimum viable nodes first; avoid over-complicated graphs.",
    "For each node config, include only valid keys from that component.",
    "Use realistic defaults and preserve conditional logic requirements from showWhen.",
    "If task implies external auth, prefer secret references like {{secrets.KEY}}.",
    "Use branch labels on edges only for decision nodes (if/switch).",
    "Return strictly valid JSON only.",
  ].join("\n");

  const systemPrompt = [
    "You are an expert workflow planner.",
    plannerGuardrails,
    "Prefer practical defaults in config and include an entry-point node as first node.",
    "Output shape:",
    "{",
    '  "name": "string",',
    '  "description": "string",',
    '  "nodes": [',
    "    {",
    '      "tempId": "node-1",',
    '      "componentId": "entry-point",',
    '      "label": "string",',
    '      "description": "string",',
    '      "config": {},',
    '      "position": { "x": 300, "y": 50 }',
    "    }",
    "  ],",
    '  "edges": [{ "source": "node-1", "target": "node-2", "label": "optional" }]',
    "}",
    `Allowed componentIds: ${allowedComponents.join(", ")}`,
    componentContext,
  ].join("\n");

  const promptPreview =
    prompt.length > 160 ? `${prompt.slice(0, 160)}...` : prompt;
  console.info("[workflow-generate] LLM generation started", {
    providers: providerConfigs.map((p) => ({ provider: p.provider, models: p.models })),
    promptLength: prompt.length,
    promptPreview,
    componentCount: allowedComponents.length,
  });
  const { content, model, provider } = await completeWithModelFallback([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Generate a workflow for this request:\n${prompt}`,
    },
  ]);
  const json = extractJsonObject(content);
  const parsed = JSON.parse(json) as LlmWorkflowDraft;
  const normalized = normalizeLlmDraft(parsed, prompt);
  const validated = await validateAndRepairGeneratedWorkflow(normalized);
  console.info("[workflow-generate] Generation completed", {
    provider,
    model,
    nodeCount: validated.nodes.length,
    edgeCount: validated.edges.length,
  });
  return validated;
}

async function generateWorkflowFromPrompt(prompt: string): Promise<{
  name: string;
  description: string;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}> {
  // Try real LLM generation first.
  try {
    return await generateWorkflowWithLlm(prompt);
  } catch (llmError) {
    // Fall back to deterministic templates to keep UX resilient.
    console.warn("[workflow-generate] LLM failed, using template fallback", {
      message: (llmError as { message?: string })?.message || String(llmError),
    });
  }

  const lowerPrompt = prompt.toLowerCase();

  // Pattern matching for different use cases
  if (lowerPrompt.includes("meeting") || lowerPrompt.includes("transcript")) {
    return generateMeetingWorkflow(prompt);
  }

  if (lowerPrompt.includes("customer") || lowerPrompt.includes("support") || lowerPrompt.includes("ticket")) {
    return generateSupportWorkflow(prompt);
  }

  if (lowerPrompt.includes("lead") || lowerPrompt.includes("sales") || lowerPrompt.includes("outreach")) {
    return generateSalesWorkflow(prompt);
  }

  if (lowerPrompt.includes("onboarding") || lowerPrompt.includes("employee") || lowerPrompt.includes("hr")) {
    return generateOnboardingWorkflow(prompt);
  }

  if (lowerPrompt.includes("invoice") || lowerPrompt.includes("payment") || lowerPrompt.includes("billing")) {
    return generateInvoiceWorkflow(prompt);
  }

  if (lowerPrompt.includes("incident") || lowerPrompt.includes("alert") || lowerPrompt.includes("pager")) {
    return generateIncidentWorkflow(prompt);
  }

  if (
    lowerPrompt.includes("github") ||
    lowerPrompt.includes("git hub") ||
    lowerPrompt.includes("pull request") ||
    lowerPrompt.includes("pull-request") ||
    lowerPrompt.includes("repo issue")
  ) {
    return generateGithubWorkflow(prompt);
  }

  if (
    lowerPrompt.includes("google calendar") ||
    lowerPrompt.includes("google meet") ||
    lowerPrompt.includes("google docs") ||
    lowerPrompt.includes("google sheets") ||
    (lowerPrompt.includes("google") &&
      (lowerPrompt.includes("sheet") ||
        lowerPrompt.includes("spreadsheet") ||
        lowerPrompt.includes("doc") ||
        lowerPrompt.includes("calendar") ||
        lowerPrompt.includes("meet")))
  ) {
    return generateGoogleCloudServicesWorkflow(prompt);
  }

  // Default generic workflow
  return generateGenericWorkflow(prompt);
}

function generateGoogleCloudServicesWorkflow(_prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode(
      "node-1",
      "entry-point",
      "Trigger",
      "Start when you want to use Calendar, Meet (via Calendar), Sheets, or Docs APIs",
      { triggerMode: "webhook", webhookPath: "/google-cloud-services" },
      { x: 300, y: 40 },
    ),
    catalogNode(
      "node-2",
      "google-calendar",
      "List events",
      "List events from the user primary calendar",
      {
        authMode: "manual",
        credentialType: "oauth_access_token",
        calendarId: "primary",
        operation: "list_events",
        timeMin: "2025-03-01T00:00:00Z",
        timeMax: "2025-03-31T23:59:59Z",
        credentialsSecret: "{{secrets.GOOGLE_CAL_OAUTH}}",
      },
      { x: 300, y: 150 },
    ),
    catalogNode(
      "node-3",
      "google-meet",
      "Create Meet",
      "Create a calendar event with a Google Meet conference link",
      {
        authMode: "manual",
        credentialType: "oauth_access_token",
        calendarId: "primary",
        operation: "create_scheduled_meeting",
        meetingTitle: "Workflow standup",
        startTime: "2025-03-25T15:00:00Z",
        endTime: "2025-03-25T15:30:00Z",
        credentialsSecret: "{{secrets.GOOGLE_CAL_OAUTH}}",
      },
      { x: 300, y: 280 },
    ),
    catalogNode(
      "node-4",
      "google-sheets",
      "Read range",
      "Read a range from a spreadsheet (replace YOUR_SPREADSHEET_ID)",
      {
        authMode: "manual",
        credentialType: "oauth_access_token",
        spreadsheetId: "YOUR_SPREADSHEET_ID",
        operation: "read_range",
        rangeA1: "Sheet1!A1:C20",
        credentialsSecret: "{{secrets.GOOGLE_SHEETS_OAUTH}}",
      },
      { x: 300, y: 410 },
    ),
    catalogNode(
      "node-5",
      "google-docs",
      "Get document",
      "Fetch a Doc by ID (replace YOUR_DOC_ID from the URL)",
      {
        authMode: "manual",
        credentialType: "oauth_access_token",
        documentId: "YOUR_DOC_ID",
        operation: "get_document",
        credentialsSecret: "{{secrets.GOOGLE_DOCS_OAUTH}}",
      },
      { x: 300, y: 540 },
    ),
    catalogNode(
      "node-6",
      "slack-send",
      "Notify",
      "Ping a channel when the Google steps complete",
      {
        mode: "webhook",
        channel: "#ops",
        message: "Google Calendar / Sheets / Docs pipeline finished — check run output (live if tokens set).",
      },
      { x: 300, y: 670 },
    ),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
    { source: "node-5", target: "node-6" },
  ];

  return {
    name: "Google Calendar, Meet, Sheets & Docs (separate APIs)",
    description:
      "Uses **four separate Google Cloud APIs**: Calendar v3, Calendar v3 again for Meet links, Sheets v4, Docs v1. Fine for **free Gmail** accounts once APIs are enabled. Replace placeholder IDs; paste tokens or SA JSON for live calls.",
    nodes,
    edges,
  };
}

function generateGithubWorkflow(_prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode(
      "node-1",
      "entry-point",
      "Webhook / manual trigger",
      "Start when an event should sync to GitHub",
      { triggerMode: "webhook", webhookPath: "/github-sync" },
      { x: 300, y: 50 },
    ),
    catalogNode(
      "node-2",
      "github",
      "Fetch repository",
      "Load repo metadata from GitHub API",
      {
        owner: "octocat",
        repo: "Hello-World",
        operation: "get_repository",
        personalAccessToken: "{{secrets.GITHUB_TOKEN}}",
      },
      { x: 300, y: 220 },
    ),
    catalogNode(
      "node-3",
      "github",
      "List open issues",
      "Pull recent open issues for triage",
      {
        owner: "octocat",
        repo: "Hello-World",
        operation: "list_issues",
        perPage: 5,
        personalAccessToken: "{{secrets.GITHUB_TOKEN}}",
      },
      { x: 300, y: 390 },
    ),
    catalogNode(
      "node-4",
      "slack-send",
      "Notify channel",
      "Post a short summary to Slack",
      {
        mode: "webhook",
        channel: "#engineering",
        message: "GitHub check complete for {{payload.repo}}",
      },
      { x: 300, y: 560 },
    ),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
  ];

  return {
    name: "GitHub repository sync",
    description: "Fetch repo info and open issues from GitHub, then notify your team",
    nodes,
    edges,
  };
}

function generateMeetingWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "Meeting Recording Received",
      "Triggered when a new meeting recording is uploaded",
      { triggerMode: "webhook", webhookPath: "/meeting-upload" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Transcription Agent",
      "Transcribe meeting audio and extract raw text",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Transcribe and extract text", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Meeting Summarizer",
      "Generate structured meeting summary with key points",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Summarize meeting notes", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "ai-agent", "Task Extractor",
      "Extract action items and assign owners",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Extract action items", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 500 }),
    catalogNode("node-5", "ai-agent", "Priority Classifier",
      "Classify tasks by priority and urgency",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Classify priority", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 650 }),
    catalogNode("node-6", "slack-send", "Send to Slack",
      "Post summary and tasks to Slack channel",
      { mode: "webhook", channel: "#meetings", message: "{{payload.summary}}" }, { x: 100, y: 800 }),
    catalogNode("node-7", "email-send", "Email Participants",
      "Send summary email to all meeting participants",
      { provider: "smtp", from: "noreply@company.com", to: "team@company.com", subject: "Meeting Summary", body: "{{payload.summary}}" },
      { x: 500, y: 800 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
    { source: "node-5", target: "node-6" },
    { source: "node-5", target: "node-7" },
  ];

  return {
    name: "Meeting Intelligence Automation",
    description: "Automatically process meeting recordings, extract action items, and distribute summaries",
    nodes,
    edges,
  };
}

function generateSupportWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "New Ticket Received",
      "Triggered when new support ticket is created",
      { triggerMode: "webhook", webhookPath: "/support/ticket" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Ticket Classifier",
      "Classify ticket category and severity",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Classify support tickets", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Response Generator",
      "Generate initial response based on KB articles",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Draft professional support response", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "if-condition", "Escalation Check",
      "Decide if ticket needs human escalation",
      { leftPath: "payload.severity", operator: "equals", rightValue: "high" }, { x: 300, y: 500 }),
    catalogNode("node-5", "approval", "Manager Approval",
      "Require manager approval for high-severity tickets",
      { approvers: "manager@company.com", message: "Review escalated ticket", timeoutHours: 24 },
      { x: 100, y: 650 }),
    catalogNode("node-6", "slack-send", "Notify Support Team",
      "Send escalation alert to support channel",
      { mode: "webhook", channel: "#support-escalations", message: "{{payload.summary}}" },
      { x: 500, y: 650 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5", label: "Needs escalation" },
    { source: "node-4", target: "node-6", label: "Auto-respond" },
  ];

  return {
    name: "Customer Support Automation",
    description: "Automatically classify, respond to, and escalate support tickets",
    nodes,
    edges,
  };
}

function generateSalesWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "New Lead Captured",
      "Triggered when a new lead is captured from form/API",
      { triggerMode: "webhook", webhookPath: "/leads/new" }, { x: 300, y: 50 }),
    catalogNode("node-2", "http-request", "Lead Data Enrichment",
      "Enrich lead data with company info and social profiles",
      { method: "GET", url: "https://api.clearbit.com/v1/enrichment" }, { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Lead Scoring",
      "Score lead quality based on firmographics and behavior",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Score lead quality", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "ai-agent", "Routing Decision",
      "Route to appropriate sales rep based on territory and score",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Route lead to rep", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 500 }),
    catalogNode("node-5", "email-send", "Send Outreach Email",
      "Send personalized outreach email to lead",
      { provider: "smtp", from: "sales@company.com", to: "{{payload.email}}", subject: "Welcome!", body: "Hi {{payload.name}}" },
      { x: 100, y: 650 }),
    catalogNode("node-6", "slack-send", "Notify Sales Rep",
      "Alert assigned sales rep via Slack",
      { mode: "webhook", channel: "#sales-leads", message: "New lead: {{payload.name}}" },
      { x: 500, y: 650 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
    { source: "node-4", target: "node-6" },
  ];

  return {
    name: "Sales Lead Qualification & Outreach",
    description: "Automatically qualify, score, and route new sales leads with personalized outreach",
    nodes,
    edges,
  };
}

function generateOnboardingWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "New Hire Created in HRIS",
      "Triggered when HR creates new employee record",
      { triggerMode: "api" }, { x: 300, y: 50 }),
    catalogNode("node-2", "http-request", "Create IT Accounts",
      "Provision email, Slack, and tool access",
      { method: "POST", url: "https://api.internal.com/provision" }, { x: 300, y: 200 }),
    catalogNode("node-3", "email-send", "Welcome Email",
      "Send welcome email with onboarding guide",
      { provider: "smtp", from: "hr@company.com", to: "{{payload.email}}", subject: "Welcome!", body: "Welcome to the team!" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "slack-send", "Introduce in Slack",
      "Post introduction in team channel",
      { mode: "webhook", channel: "#team-intros", message: "Welcome {{payload.name}}!" },
      { x: 300, y: 500 }),
    catalogNode("node-5", "approval", "Manager Checklist",
      "Manager confirms onboarding checklist completion",
      { approvers: "manager@company.com", message: "Confirm onboarding complete", timeoutHours: 72 },
      { x: 300, y: 650 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
  ];

  return {
    name: "Employee Onboarding Workflow",
    description: "Automate new employee onboarding with IT provisioning and team introductions",
    nodes,
    edges,
  };
}

function generateInvoiceWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "Invoice Uploaded",
      "Triggered when invoice document is uploaded",
      { triggerMode: "webhook", webhookPath: "/invoices/upload" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Invoice Data Extractor",
      "Extract vendor, amount, line items from invoice",
      { provider: "openai", model: "gpt-4o", systemPrompt: "Extract invoice data", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Data Validator",
      "Validate extracted data against PO and contracts",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Validate invoice data", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "if-condition", "Approval Routing",
      "Route to appropriate approver based on amount",
      { leftPath: "payload.amount", operator: "gt", rightValue: "1000" }, { x: 300, y: 500 }),
    catalogNode("node-5", "approval", "Approval Required",
      "Human approval for invoice payment",
      { approvers: "finance@company.com", message: "Approve invoice {{payload.invoiceId}}", timeoutHours: 48 },
      { x: 300, y: 650 }),
    catalogNode("node-6", "db-query", "Record Payment",
      "Record approved payment in accounting system",
      { dbType: "postgresql", connectionString: "{{secrets.DB_URL}}", operation: "insert", query: "INSERT INTO payments (invoice_id, amount) VALUES ($1, $2)", params: [] },
      { x: 300, y: 800 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
    { source: "node-5", target: "node-6" },
  ];

  return {
    name: "Invoice Processing & Approval",
    description: "Automate invoice processing with AI extraction, validation, and approval routing",
    nodes,
    edges,
  };
}

function generateIncidentWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "Alert Received",
      "Triggered by monitoring system alert (PagerDuty, Datadog)",
      { triggerMode: "webhook", webhookPath: "/alerts/incoming" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Severity Classifier",
      "Classify incident severity and impact",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Classify incident severity", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Root Cause Analyzer",
      "Analyze logs and metrics to suggest root cause",
      { provider: "openai", model: "gpt-4o", systemPrompt: "Analyze root cause from logs", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "slack-send", "Create Incident Channel",
      "Create dedicated Slack channel for incident",
      { mode: "webhook", channel: "#incidents", message: "Incident: {{payload.title}}" },
      { x: 300, y: 500 }),
    catalogNode("node-5", "email-send", "Notify Stakeholders",
      "Send incident notification to stakeholders",
      { provider: "smtp", from: "alerts@company.com", to: "oncall@company.com", subject: "Incident: {{payload.title}}", body: "{{payload.summary}}" },
      { x: 300, y: 650 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
  ];

  return {
    name: "Incident Response Automation",
    description: "Automate incident classification, analysis, and stakeholder notification",
    nodes,
    edges,
  };
}

function generateGenericWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "Incoming Request",
      "Webhook trigger for incoming data",
      { triggerMode: "webhook", webhookPath: "/incoming" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Data Processor",
      "Extract and process incoming data",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Process and extract data", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Analysis Agent",
      "Analyze processed data and generate insights",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Analyze data and generate insights", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "slack-send", "Send Notification",
      "Send results via Slack",
      { mode: "webhook", channel: "#notifications", message: "{{payload.summary}}" },
      { x: 300, y: 500 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
  ];

  return {
    name: "AI Workflow",
    description: `AI-generated workflow for: ${prompt}`,
    nodes,
    edges,
  };
}

export const generateRouter = router;
