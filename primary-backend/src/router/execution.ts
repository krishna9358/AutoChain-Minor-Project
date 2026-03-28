import { Router } from "express";
import { ApiScope, Prisma } from "@prisma/client";
import prisma from "../db";
import { dualAuthMiddleware, AuthRequest } from "../middleware";
import { resolveComponentId } from "./componentCatalog";
import { executeGithubNode } from "../execution/github-node";
import { executeGoogleCloudNode } from "../execution/google-cloud-node";
import { NodeExecutorFactory } from "../execution/factory";
import type { NodeExecutionContext } from "../types/nodes";
import {
  getWorkspaceSecretsMap,
  applySecretsToWorkflowNodes,
} from "../services/workspaceSecretResolver";
import { broadcastRunUpdate } from "../utils/wsBroadcast";

/** API keys scoped to a workspace may only touch workflows in that workspace. User-wide keys require membership. */
async function assertApiKeyCanAccessWorkflowWorkspace(
  req: AuthRequest,
  workflowWorkspaceId: string,
): Promise<{ ok: true } | { ok: false; status: number; body: Record<string, unknown> }> {
  if (req.authMethod !== "api_key") {
    return { ok: true };
  }
  if (req.apiKeyWorkspaceId) {
    if (req.apiKeyWorkspaceId !== workflowWorkspaceId) {
      return {
        ok: false,
        status: 403,
        body: { error: "This API key is restricted to a different workspace" },
      };
    }
    return { ok: true };
  }
  const m = await prisma.workspaceMember.findFirst({
    where: { userId: req.userId!, workspaceId: workflowWorkspaceId },
  });
  if (!m) {
    return {
      ok: false,
      status: 403,
      body: { error: "Access denied to this workflow's workspace" },
    };
  }
  return { ok: true };
}

async function loadRunWorkspaceId(runId: string): Promise<string | null> {
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    select: { workflow: { select: { workspaceId: true } } },
  });
  return run?.workflow?.workspaceId ?? null;
}

/** Each id maps to its own Google Cloud API (Calendar v3, Docs v1, Sheets v4; Meet uses Calendar conferenceData). */
const GOOGLE_CLOUD_NODE_IDS = [
  "google-calendar",
  "google-meet",
  "google-docs",
  "google-sheets",
  "gmail",
] as const;

async function executeIntegrationNode(
  resolvedId: string | null,
  node: any,
  workflowWorkspaceId?: string | null,
): Promise<Record<string, unknown>> {
  const cfg = (node.config || {}) as Record<string, unknown>;
  if (resolvedId === "github") {
    return executeGithubNode(cfg);
  }
  if (resolvedId && GOOGLE_CLOUD_NODE_IDS.includes(resolvedId as (typeof GOOGLE_CLOUD_NODE_IDS)[number])) {
    return executeGoogleCloudNode(
      resolvedId,
      cfg,
      workflowWorkspaceId ? { workspaceId: workflowWorkspaceId } : undefined,
    );
  }
  return generateNodeOutput(node) as Record<string, unknown>;
}

const router = Router();

/** Match runtime: explicit authMode, else manual if credentialsSecret is set (legacy workflows). */
function effectiveGoogleAuthModeForValidation(config: Record<string, any>): "oauth_connection" | "manual" {
  const a = String(config.authMode || "").toLowerCase();
  if (a === "manual") return "manual";
  if (a === "oauth_connection") return "oauth_connection";
  if (String(config.credentialsSecret ?? "").trim()) return "manual";
  return "oauth_connection";
}

/** OAuth connection vs manual credentials for Google integration nodes. */
function missingGoogleAuthFields(config: Record<string, any>): string[] {
  const m: string[] = [];
  const mode = effectiveGoogleAuthModeForValidation(config);
  if (mode === "oauth_connection") {
    if (!String(config.googleConnectionId ?? "").trim()) m.push("googleConnectionId");
  } else if (mode === "manual") {
    const sec = config.credentialsSecret;
    if (sec == null || String(sec).trim() === "") m.push("credentialsSecret");
  } else {
    m.push("authMode");
  }
  return m;
}

/** Pre-run validation for Google Calendar / Meet / Docs / Sheets catalog nodes (mirrors catalog Zod rules). */
function missingGoogleCloudServiceFields(
  resolved: string,
  config: Record<string, any>,
): string[] {
  const m: string[] = [];
  if (resolved === "google-calendar") {
    if (!String(config.calendarId ?? "primary").trim()) m.push("calendarId");
    if (!config.operation) m.push("operation");
    const op = config.operation;
    if (["get_event", "delete_event", "update_event"].includes(op) && !String(config.eventId ?? "").trim()) {
      m.push("eventId");
    }
    if (op === "create_event") {
      if (!String(config.eventSummary ?? "").trim()) m.push("eventSummary");
      if (!String(config.eventStart ?? "").trim()) m.push("eventStart");
      if (!String(config.eventEnd ?? "").trim()) m.push("eventEnd");
    }
    return m;
  }
  if (resolved === "google-meet") {
    if (!String(config.calendarId ?? "primary").trim()) m.push("calendarId");
    if (!config.operation) m.push("operation");
    if (config.operation === "create_scheduled_meeting") {
      if (!String(config.meetingTitle ?? "").trim()) m.push("meetingTitle");
      if (!String(config.startTime ?? "").trim()) m.push("startTime");
      if (!String(config.endTime ?? "").trim()) m.push("endTime");
    }
    if (config.operation === "attach_meet_to_event" && !String(config.existingEventId ?? "").trim()) {
      m.push("existingEventId");
    }
    return m;
  }
  if (resolved === "google-docs") {
    if (!config.operation) m.push("operation");
    const op = config.operation;
    if (op === "create_document" && !String(config.newDocumentTitle ?? "").trim()) {
      m.push("newDocumentTitle");
    }
    if (["get_document", "append_paragraph", "replace_all_text"].includes(op) && !String(config.documentId ?? "").trim()) {
      m.push("documentId");
    }
    if (op === "append_paragraph" && !String(config.appendText ?? "").trim()) m.push("appendText");
    if (op === "replace_all_text") {
      if (!String(config.findText ?? "").trim()) m.push("findText");
      if (!String(config.replaceText ?? "").trim()) m.push("replaceText");
    }
    return m;
  }
  if (resolved === "google-sheets") {
    if (!String(config.spreadsheetId ?? "").trim()) m.push("spreadsheetId");
    if (!config.operation) m.push("operation");
    if (!String(config.rangeA1 ?? "").trim()) m.push("rangeA1");
    const op = config.operation;
    if (["append_rows", "update_values"].includes(op)) {
      const v = config.valuesJson;
      if (!Array.isArray(v) || v.length === 0) m.push("valuesJson");
    }
    return m;
  }
  return m;
}

// Validate node configs before execution - returns first validation error found
function validateNodeConfigs(nodes: any[]): { nodeId: string; nodeLabel: string; missingFields: string[] } | null {
  // Map of nodeType to required config fields
  const requiredFields: Record<string, string[]> = {
    HTTP_REQUEST: ["url", "method"],
    API_CALL: ["url", "method"],
    EMAIL_SEND: ["to", "subject"],
    SLACK_SEND: ["channel", "message"],
    DB_WRITE: ["query"],
    WEBHOOK_TRIGGER: [],
    SCHEDULE_TRIGGER: ["cron"],
    IF_CONDITION: ["condition"],
    DELAY: ["delayMs"],
  };

  for (const node of nodes) {
    const resolved =
      resolveComponentId(String(node.nodeType || "")) ||
      resolveComponentId(String(node.metadata?.componentId || ""));

    if (resolved === "github") {
      const config = (node.config as Record<string, any>) || {};
      const missing: string[] = [];
      if (!String(config.owner ?? "").trim()) missing.push("owner");
      if (!String(config.repo ?? "").trim()) missing.push("repo");
      if (!config.operation) missing.push("operation");
      if (
        config.operation === "create_issue" &&
        !String(config.issueTitle ?? "").trim()
      ) {
        missing.push("issueTitle");
      }
      if (missing.length > 0) {
        return {
          nodeId: node.id,
          nodeLabel: node.label || node.nodeType,
          missingFields: missing,
        };
      }
      continue;
    }

    if (
      resolved &&
      ["google-calendar", "google-meet", "google-docs", "google-sheets"].includes(resolved)
    ) {
      const config = (node.config as Record<string, any>) || {};
      const missing = [
        ...missingGoogleAuthFields(config),
        ...missingGoogleCloudServiceFields(resolved, config),
      ];
      if (missing.length > 0) {
        return {
          nodeId: node.id,
          nodeLabel: node.label || node.nodeType,
          missingFields: missing,
        };
      }
      continue;
    }

    const required = requiredFields[node.nodeType];
    if (!required) continue; // no validation rule for this node type

    const config = (node.config as Record<string, any>) || {};
    const missing = required.filter(
      (field) => config[field] === undefined || config[field] === null || config[field] === "",
    );

    if (missing.length > 0) {
      return {
        nodeId: node.id,
        nodeLabel: node.label || node.nodeType,
        missingFields: missing,
      };
    }
  }

  return null;
}

/** True if this node is a sub-node (chat-model, memory, tool) — not an executable step. */
function isSubNode(n: any): boolean {
  const ntype = (n.nodeType || "").toLowerCase().replace(/_/g, "-");
  const compId = ((n.metadata as any)?.componentId || "").toLowerCase();
  return (
    ntype === "chat-model" || compId === "chat-model" ||
    ntype === "agent-memory" || compId === "agent-memory" ||
    ntype === "agent-tool" || compId === "agent-tool"
  );
}

/** True if this node is the workflow entry / trigger (catalog or legacy). */
function isEntryTriggerNode(n: any): boolean {
  const cat = (n.category || "").toLowerCase();
  const ntype = (n.nodeType || "").toLowerCase().replace(/_/g, "-");
  const compId = (n.metadata?.componentId || "").toLowerCase();
  return (
    cat === "trigger" ||
    cat === "input" ||
    ntype === "webhook-trigger" ||
    ntype === "entry-point" ||
    ntype === "schedule-trigger" ||
    ntype === "event-trigger" ||
    compId === "entry-point"
  );
}

/** Detect Artifact Writer across catalog IDs, aliases, and legacy nodeType strings. */
function isArtifactWriterNode(node: any): boolean {
  const rawType = String(node?.nodeType || "");
  const meta = node?.metadata;
  const rawComp =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? String((meta as Record<string, unknown>).componentId || "")
      : "";
  const nKab = rawType.toLowerCase().replace(/_/g, "-");
  const cKab = rawComp.toLowerCase().replace(/_/g, "-");
  const resolved =
    resolveComponentId(rawType) || resolveComponentId(rawComp);
  return (
    resolved === "artifact-writer" ||
    nKab === "artifact-writer" ||
    cKab === "artifact-writer"
  );
}

/** True if the edge is a sub-node connection (chat-model, memory, tool handles). */
function isSubNodeEdge(edge: any, nodes: any[]): boolean {
  if (edge.sourceHandle || edge.targetHandle) return true;
  const src = nodes.find((n: any) => n.id === edge.sourceNodeId);
  if (src && isSubNode(src)) return true;
  const tgt = nodes.find((n: any) => n.id === edge.targetNodeId);
  if (tgt && isSubNode(tgt)) return true;
  return false;
}

function buildParentMap(
  edges: any[],
  nodeIds: Set<string>,
  nodes: any[],
): Map<string, string[]> {
  const parents = new Map<string, string[]>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) continue;
    if (isSubNodeEdge(edge, nodes)) continue;
    const arr = parents.get(edge.targetNodeId) || [];
    arr.push(edge.sourceNodeId);
    parents.set(edge.targetNodeId, arr);
  }
  return parents;
}

/**
 * Find a fallback edge originating from a failed node.
 * A fallback edge is identified by `condition: { type: "fallback" }` or `label`
 * containing the word "fallback" (case-insensitive).
 */
function findFallbackEdge(edges: any[], failedNodeId: string): any | null {
  return (
    edges.find((edge) => {
      if (edge.sourceNodeId !== failedNodeId) return false;
      // Check condition JSON
      if (
        edge.condition &&
        typeof edge.condition === "object" &&
        (edge.condition as Record<string, unknown>).type === "fallback"
      ) {
        return true;
      }
      // Check label
      if (
        typeof edge.label === "string" &&
        edge.label.toLowerCase().includes("fallback")
      ) {
        return true;
      }
      return false;
    }) || null
  );
}

function normalizeTriggerPayload(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function computeStepInput(
  node: any,
  triggerPayload: Record<string, unknown>,
  parentIds: string[],
  outputMap: Map<string, unknown>,
): Record<string, unknown> {
  if (isEntryTriggerNode(node)) {
    return { source: "trigger", data: triggerPayload };
  }
  if (parentIds.length === 0) {
    return { source: "no_upstream", data: {} };
  }
  if (parentIds.length === 1) {
    const pid = parentIds[0];
    return {
      source: "upstream",
      upstreamNodeId: pid,
      data: outputMap.get(pid) ?? {},
    };
  }
  return {
    source: "merge",
    parents: parentIds.map((id) => ({
      nodeId: id,
      output: outputMap.get(id) ?? {},
    })),
  };
}

function enrichEntryOutput(output: any, triggerPayload: Record<string, unknown>) {
  if (!output || typeof output !== "object") return output;
  const basePayload =
    output.payload && typeof output.payload === "object" ? output.payload : {};
  return {
    ...output,
    triggerInput: triggerPayload,
    payload: { ...basePayload, ...triggerPayload },
  };
}

// Execute a workflow
router.post(
  "/run/:workflowId",
  dualAuthMiddleware([ApiScope.EXECUTE]),
  async (req: AuthRequest, res) => {
    try {
      const { workflowId } = req.params;
      const { triggerData } = req.body;

      // Validate workflowId format
      if (!workflowId || typeof workflowId !== "string" || workflowId.trim() === "") {
        return res.status(400).json({ error: "Invalid workflowId" });
      }

      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { nodes: true, edges: true },
      });

      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      const gate = await assertApiKeyCanAccessWorkflowWorkspace(req, workflow.workspaceId);
      if (!gate.ok) {
        return res.status(gate.status).json(gate.body);
      }

      if (workflow.nodes.length === 0) {
        return res.status(400).json({ error: "Workflow has no nodes. Add at least one node before running." });
      }

      const secretMap = await getWorkspaceSecretsMap(workflow.workspaceId);
      const nodesWithSecrets = applySecretsToWorkflowNodes(workflow.nodes, secretMap);

      // Validate node configs before creating a run (after {{secrets.KEY}} resolution)
      const configError = validateNodeConfigs(nodesWithSecrets);
      if (configError) {
        return res.status(400).json({
          error: `Node "${configError.nodeLabel}" is missing required configuration: ${configError.missingFields.join(", ")}. Please configure this node before running.`,
          details: {
            nodeId: configError.nodeId,
            nodeLabel: configError.nodeLabel,
            missingFields: configError.missingFields,
          },
        });
      }

      // Create run
      const run = await prisma.workflowRun.create({
        data: {
          workflowId,
          status: "RUNNING",
          triggerData: triggerData || {},
          startedAt: new Date(),
        },
      });

      // Create pending steps for each node (skip sub-nodes like chat-model, memory, tool)
      const executableNodes = nodesWithSecrets.filter((n: any) => !isSubNode(n));
      await prisma.$transaction(
        executableNodes.map((node: any) =>
          prisma.runStep.create({
            data: {
              runId: run.id,
              nodeId: node.id,
              status: "PENDING",
            },
          })
        )
      );

      // Simulate execution (in production, use a job queue)
      simulateExecution(run.id, nodesWithSecrets, workflow.edges).catch(async (err) => {
        console.error(`Workflow run ${run.id} failed unexpectedly:`, err);
        await prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: "FAILED",
            error: err.message || "Unexpected execution error",
            completedAt: new Date(),
          },
        }).catch(() => {}); // best-effort status update
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          workflowId,
          userId: req.userId!,
          action: "run.started",
          details: { runId: run.id },
        },
      });

      res.json({
        ...run,
        nodeCount: workflow.nodes.length,
        message: "Workflow execution started",
      });
    } catch (err: any) {
      console.error("Execute error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// Cancel a running workflow
router.post(
  "/run/:runId/cancel",
  dualAuthMiddleware([ApiScope.EXECUTE]),
  async (req: AuthRequest, res) => {
  try {
    const run = await prisma.workflowRun.findUnique({
      where: { id: req.params.runId },
      include: { workflow: { select: { workspaceId: true } } },
    });

    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }

    const gate = await assertApiKeyCanAccessWorkflowWorkspace(
      req,
      run.workflow.workspaceId,
    );
    if (!gate.ok) {
      return res.status(gate.status).json(gate.body);
    }

    if (
      run.status !== "RUNNING" &&
      run.status !== "PENDING" &&
      run.status !== "WAITING_APPROVAL"
    ) {
      return res.status(400).json({ error: `Cannot cancel run with status: ${run.status}` });
    }

    await prisma.$transaction([
      prisma.workflowRun.update({
        where: { id: req.params.runId },
        data: {
          status: "CANCELLED",
          error: "Cancelled by user",
          completedAt: new Date(),
        },
      }),
      prisma.runStep.updateMany({
        where: { runId: req.params.runId, status: { in: ["PENDING", "RUNNING"] } },
        data: { status: "CANCELLED", completedAt: new Date() },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        workflowId: run.workflowId,
        userId: req.userId!,
        action: "run.cancelled",
        details: { runId: req.params.runId },
      },
    });

    res.json({ message: "Run cancelled", runId: req.params.runId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
},
);

// Handle approval decision
router.post(
  "/run/:runId/approve",
  dualAuthMiddleware([ApiScope.EXECUTE]),
  async (req: AuthRequest, res) => {
  try {
    const { approved, comment } = req.body;
    const { runId } = req.params;

    const wsId = await loadRunWorkspaceId(runId);
    if (!wsId) {
      return res.status(404).json({ error: "Run not found" });
    }
    const gate0 = await assertApiKeyCanAccessWorkflowWorkspace(req, wsId);
    if (!gate0.ok) {
      return res.status(gate0.status).json(gate0.body);
    }

    const approval = await prisma.approval.findFirst({
      where: { runId, status: "PENDING" },
    });

    if (!approval) {
      return res.status(404).json({ error: "No pending approval found for this run" });
    }

    await prisma.$transaction([
      prisma.approval.update({
        where: { id: approval.id },
        data: {
          status: approved ? "APPROVED" : "REJECTED",
          userId: req.userId,
          decidedAt: new Date(),
          comment: comment || null,
        },
      }),
      prisma.runStep.updateMany({
        where: { runId, nodeId: approval.nodeId, status: "WAITING_APPROVAL" },
        data: {
          status: approved ? "COMPLETED" : "FAILED",
          completedAt: new Date(),
          outputPayload: { approved, approver: req.userId, comment },
        },
      }),
    ]);

    if (approved) {
      // Resume execution from the approval node
      const run = await prisma.workflowRun.findUnique({
        where: { id: runId },
        include: { workflow: { include: { nodes: true, edges: true } } },
      });

      if (run?.workflow) {
        await prisma.workflowRun.update({
          where: { id: runId },
          data: { status: "RUNNING" },
        });

        // Build adjacency and resume from approval node's children
        const adjacency = new Map<string, string[]>();
        for (const edge of run.workflow.edges) {
          const sources = adjacency.get(edge.sourceNodeId) || [];
          sources.push(edge.targetNodeId);
          adjacency.set(edge.sourceNodeId, sources);
        }

        const nextNodes = adjacency.get(approval.nodeId) || [];
        if (nextNodes.length > 0) {
          const secretMapResume = await getWorkspaceSecretsMap(run.workflow.workspaceId);
          const nodesResume = applySecretsToWorkflowNodes(run.workflow.nodes, secretMapResume);
          // Continue execution from next nodes (fire-and-forget with error handling)
          resumeExecution(runId, nodesResume, run.workflow.edges, nextNodes).catch(async (err) => {
            console.error(`Resume after approval failed for run ${runId}:`, err);
            await prisma.workflowRun.update({
              where: { id: runId },
              data: { status: "FAILED", error: err.message, completedAt: new Date() },
            }).catch(() => {});
          });
        } else {
          await prisma.workflowRun.update({
            where: { id: runId },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
        }
      }
    } else {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          error: `Approval rejected${comment ? `: ${comment}` : ""}`,
          completedAt: new Date(),
        },
      });
    }

    res.json({ message: approved ? "Approved" : "Rejected", runId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
},
);

// Simulated execution engine
async function simulateExecution(runId: string, nodes: any[], edges: any[]) {
  const runRecord = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { workflow: true },
  });
  const triggerPayload = normalizeTriggerPayload(runRecord?.triggerData);
  const workspaceId = runRecord?.workflow?.workspaceId;
  const workflowIdForArtifact = runRecord?.workflowId;

  // Find trigger/entry-point node (supports both legacy and catalog conventions)
  const triggerNode = nodes.find((n) => {
    const cat = (n.category || "").toLowerCase();
    const ntype = (n.nodeType || "").toLowerCase().replace(/_/g, "-");
    const compId = (n.metadata?.componentId || "").toLowerCase();
    return (
      cat === "trigger" || cat === "input" ||
      ntype === "webhook-trigger" || ntype === "entry-point" ||
      ntype === "schedule-trigger" || ntype === "event-trigger" ||
      compId === "entry-point"
    );
  });

  if (!triggerNode) {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        error: "No trigger node found",
        completedAt: new Date(),
      },
    });
    return;
  }

  // Build adjacency list and validate edges reference real nodes
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) continue;
    if (isSubNodeEdge(edge, nodes)) continue; // skip sub-node connections
    const sources = adjacency.get(edge.sourceNodeId) || [];
    sources.push(edge.targetNodeId);
    adjacency.set(edge.sourceNodeId, sources);
  }

  // Detect cycles via DFS before executing
  const hasCycle = (() => {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    nodes.forEach((n) => color.set(n.id, WHITE));
    const dfs = (id: string): boolean => {
      color.set(id, GRAY);
      for (const next of adjacency.get(id) || []) {
        if (color.get(next) === GRAY) return true; // back edge = cycle
        if (color.get(next) === WHITE && dfs(next)) return true;
      }
      color.set(id, BLACK);
      return false;
    };
    for (const n of nodes) {
      if (color.get(n.id) === WHITE && dfs(n.id)) return true;
    }
    return false;
  })();

  if (hasCycle) {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        error: "Workflow contains a cycle — execution aborted to prevent infinite loops",
        completedAt: new Date(),
      },
    });
    return;
  }

  const parents = buildParentMap(edges, nodeIds, nodes);
  const outputMap = new Map<string, unknown>();

  // On resume after approval, pre-populate visited set and outputMap
  // from already-completed RunSteps so BFS skips them
  const existingSteps = await prisma.runStep.findMany({
    where: { runId, status: { in: ["COMPLETED", "WAITING_APPROVAL"] } },
  });
  const visited = new Set<string>();
  for (const step of existingSteps) {
    if (step.status === "COMPLETED" && step.nodeId) {
      visited.add(step.nodeId);
      if (step.outputPayload) {
        outputMap.set(step.nodeId, step.outputPayload);
      }
    }
  }

  // BFS execution
  console.log(`[BFS] Starting. Adjacency (${adjacency.size} parents):`);
  adjacency.forEach((ch, p) => console.log(`  ${p} → ${ch.join(", ")}`));
  console.log(`[BFS] Pre-visited (${visited.size}): ${[...visited].join(", ") || "none"}`);

  const WORKFLOW_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const workflowStartTime = Date.now();

  const queue = [triggerNode.id];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;

    if (Date.now() - workflowStartTime > WORKFLOW_TIMEOUT_MS) {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          error: "Workflow execution timed out after 5 minutes",
          completedAt: new Date(),
        },
      });
      return;
    }

    if (visited.has(nodeId)) {
      const nextNodes = adjacency.get(nodeId) || [];
      const toQueue = nextNodes.filter(n => !visited.has(n));
      if (toQueue.length > 0) console.log(`[BFS] ${nodeId} visited → queuing: ${toQueue.join(", ")}`);
      for (const next of toQueue) queue.push(next);
      continue;
    }
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) { console.log(`[BFS] Node ${nodeId} not found in nodes array, skipping`); continue; }

    console.log(`[BFS] Executing: ${nodeId} (${node.label || node.nodeType || "?"})`);

    // Skip sub-nodes (chat-model, memory, tool) — they are config, not executable
    if (isSubNode(node)) {
      visited.add(nodeId);
      const nextNodes = adjacency.get(nodeId) || [];
      for (const next of nextNodes) {
        if (!visited.has(next)) queue.push(next);
      }
      continue;
    }

    // Check for approval nodes
    if (node.nodeType === "APPROVAL" || node.nodeType === "approval" || node.metadata?.componentId === "approval") {
      // Gather context from parent nodes and resolve template variables
      const parentIds = parents.get(nodeId) || [];
      const approvalContext: Record<string, any> = {};
      for (const pid of parentIds) {
        const prevOutput = outputMap.get(pid);
        if (prevOutput) approvalContext[pid] = prevOutput;
      }

      const cfg = (node.config || {}) as Record<string, any>;
      const approverEmail = cfg.approvers || cfg.assigned_to || "";
      let approvalMessage = cfg.message || "Workflow step requires your approval";
      // Resolve {{payload.field}} in the message using parent outputs
      for (const pid of parentIds) {
        const prevOut = outputMap.get(pid) as Record<string, any> | undefined;
        if (prevOut) {
          approvalMessage = approvalMessage.replace(/\{\{payload\.(\w+)\}\}/g, (_: string, key: string) => {
            return prevOut[key] || prevOut.result?.[key] || `[${key}]`;
          });
        }
      }

      await prisma.runStep.updateMany({
        where: { runId, nodeId },
        data: {
          status: "WAITING_APPROVAL",
          startedAt: new Date(),
          inputPayload: { message: approvalMessage, context: approvalContext },
        },
      });

      await prisma.approval.create({
        data: {
          runId,
          nodeId,
          status: "PENDING",
          data: { ...cfg, context: approvalContext },
        },
      });

      await prisma.workflowRun.update({
        where: { id: runId },
        data: { status: "WAITING_APPROVAL" },
      });

      // Send email notification to approver if Resend API key is available
      if (approverEmail) {
        const resendKey = await (async () => {
          if (!workspaceId) return null;
          const sMap = await getWorkspaceSecretsMap(workspaceId);
          return sMap.RESEND_API_KEY || sMap.RESEND_MAIL_SERVICE || null;
        })();
        if (resendKey) {
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(resendKey);
            const wfName = runRecord?.workflow?.name || "Workflow";
            const approvalUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/workflow/${runRecord?.workflowId}`;
            await resend.emails.send({
              from: "AutoChain <onboarding@resend.dev>",
              to: Array.isArray(approverEmail) ? approverEmail : [approverEmail],
              subject: `Approval Required: ${wfName}`,
              html: `
                <h2>Approval Required</h2>
                <p><strong>${wfName}</strong> needs your approval to continue.</p>
                <p>${approvalMessage}</p>
                <br/>
                <a href="${approvalUrl}" style="background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Review & Approve</a>
                <br/><br/>
                <p style="color:#888;font-size:12px;">Run ID: ${runId}</p>
              `,
            });
            console.log(`[approval] Email sent to ${approverEmail}`);
          } catch (emailErr: any) {
            console.warn(`[approval] Failed to send email: ${emailErr.message}`);
          }
        }
      }

      broadcastRunUpdate({
        type: "step_started",
        runId,
        nodeId,
        nodeLabel: node.label || "Approval",
        timestamp: new Date().toISOString(),
      });

      return; // Pause execution
    }

    // Simulate node execution
    const startTime = Date.now();

    broadcastRunUpdate({
      type: "step_started",
      runId,
      nodeId,
      nodeLabel: node.label || node.nodeType || nodeId,
      timestamp: new Date().toISOString(),
    });

    await prisma.runStep.updateMany({
      where: { runId, nodeId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    try {
      const parentIds = parents.get(nodeId) || [];
      const stepInput = computeStepInput(
        node,
        triggerPayload,
        parentIds,
        outputMap,
      );

      // Build previous_results from parent outputs for executor context
      const previousResults: Record<string, any> = {};
      for (const pid of parentIds) {
        const prev = outputMap.get(pid);
        if (prev) previousResults[pid] = { output: prev };
      }

      // Attempt real execution via NodeExecutorFactory
      const componentId = node.metadata?.componentId || "";
      const nodeType = node.nodeType || "";
      const resolvedExec =
        resolveComponentId(String(nodeType)) ||
        resolveComponentId(String(componentId));
      const executorKey = resolvedExec || componentId || nodeType;

      let output: any;

      // Integration nodes (github, google-*) keep their dedicated handlers
      if (resolvedExec === "github" || (resolvedExec && GOOGLE_CLOUD_NODE_IDS.includes(resolvedExec as (typeof GOOGLE_CLOUD_NODE_IDS)[number]))) {
        output = await executeIntegrationNode(resolvedExec, node, workspaceId);
      } else if (executorKey && NodeExecutorFactory.hasExecutor(executorKey)) {
        // Build a NodeExecutionContext for the real executor
        const execContext: NodeExecutionContext = {
          workflow_id: runRecord?.workflowId || runId,
          execution_id: runId,
          node_id: nodeId,
          input_data: typeof stepInput === "object" && stepInput !== null ? stepInput as Record<string, any> : { _raw: stepInput },
          variables: {},
          previous_results: previousResults,
          workflow_state: {},
          environment: "prod",
          user_context: {
            user_id: runRecord?.workflow?.userId || "system",
          },
        };

        // Map catalog camelCase config fields to executor snake_case fields
        const cfg = (node.config || {}) as Record<string, any>;
        const mappedConfig: Record<string, any> = { ...cfg };

        // AI Agent field mapping: catalog → executor
        if (executorKey === "agent" || executorKey === "ai-agent") {
          // Find connected Chat Model sub-node:
          // 1. Via explicit chatModel handle edge (new workflows)
          // 2. Via source node type detection (old workflows without handle info)
          let chatModelConfig: Record<string, any> = {};
          for (const edge of edges) {
            if (edge.targetNodeId !== nodeId) continue;
            // Match by handle
            if (edge.targetHandle === "chatModel") {
              const chatModelNode = nodes.find((n: any) => n.id === edge.sourceNodeId);
              if (chatModelNode) {
                chatModelConfig = (chatModelNode.config || {}) as Record<string, any>;
              }
              break;
            }
            // Match by source node type (fallback for edges without handle info)
            const sourceNode = nodes.find((n: any) => n.id === edge.sourceNodeId);
            if (sourceNode) {
              const sType = (sourceNode.nodeType || "").toLowerCase().replace(/_/g, "-");
              const sComp = ((sourceNode.metadata as any)?.componentId || "").toLowerCase();
              if (sType === "chat-model" || sComp === "chat-model") {
                chatModelConfig = (sourceNode.config || {}) as Record<string, any>;
                break;
              }
            }
          }

          mappedConfig.agent_type = cfg.agentType || cfg.agent_type || "executor";
          mappedConfig.goal = cfg.systemPrompt || cfg.goal || "Process the input";
          mappedConfig.tools_allowed = cfg.toolsAllowed || cfg.tools_allowed || [];

          // Build model_config from Chat Model sub-node (secret-resolved) — no env fallback
          const apiKey = chatModelConfig.apiKey || cfg.apiKey || cfg.api_key || "";
          const baseUrl = chatModelConfig.baseUrl || cfg.baseUrl || cfg.base_url || "";
          const model = chatModelConfig.model || cfg.model || "llama-3.3-70b-versatile";
          const provider = chatModelConfig.provider || cfg.provider || "groq";
          const temperature = chatModelConfig.temperature ?? cfg.temperature ?? 0.7;

          // Map provider names to base URLs
          const providerUrls: Record<string, string> = {
            groq: "https://api.groq.com/openai/v1",
            openrouter: "https://openrouter.ai/api/v1",
            openai: "https://api.openai.com/v1",
          };
          const resolvedBaseUrl = baseUrl || providerUrls[provider] || "https://api.groq.com/openai/v1";

          if (!apiKey) {
            throw new Error(
              `AI Agent "${node.label || nodeId}" has no API key configured. ` +
              `Add your API key to the Secret Library (e.g. key: AI_API_KEY) ` +
              `and set the Chat Model node's API Key field to {{secrets.AI_API_KEY}}.`
            );
          }

          mappedConfig.model_config = {
            provider: provider === "groq" || provider === "openrouter" ? "custom" : provider,
            model,
            api_key: apiKey,
            baseURL: resolvedBaseUrl,
            temperature,
          };
          mappedConfig.tool_connections = cfg.tool_connections || {};
          // Ensure tools_allowed is always an array (empty = no tool calls)
          if (!Array.isArray(mappedConfig.tools_allowed)) mappedConfig.tools_allowed = [];
          if (cfg.userPromptTemplate) mappedConfig.user_prompt_template = cfg.userPromptTemplate;
          if (cfg.responseFormat) mappedConfig.response_format = cfg.responseFormat;
          if (cfg.maxIterations) mappedConfig.max_iterations = cfg.maxIterations;
        }

        // Switch/Router field mapping: catalog → executor
        if (executorKey === "switch-case" || executorKey === "orchestrator.switch") {
          mappedConfig.value_expression = cfg.valuePath || cfg.switchField || cfg.value_expression || "";
          mappedConfig.default_branch = cfg.defaultBranch || cfg.default_branch || "default";
          mappedConfig.cases = cfg.cases || [];
        }

        // If/Else field mapping: catalog → executor
        if (executorKey === "if-condition" || executorKey === "orchestrator.conditional") {
          mappedConfig.condition = cfg.leftPath || cfg.condition || "";
          mappedConfig.true_branch = cfg.trueBranch || cfg.true_branch || "then";
          mappedConfig.false_branch = cfg.falseBranch || cfg.false_branch || "else";
          mappedConfig.operator = cfg.operator || "equals";
          mappedConfig.right_value = cfg.rightValue || cfg.right_value || "";
        }

        // Map flat workflow node to BaseNode shape expected by executors
        const baseNode: any = {
          node_id: nodeId,
          node_type: executorKey,
          name: node.label || node.name || nodeType,
          enabled: true,
          timeout_ms: 30000,
          metadata: node.metadata || {},
          config: node.config || {},
          ...node,
          ...mappedConfig,
        };

        try {
          const result = await NodeExecutorFactory.executeNode(baseNode, execContext);
          if (result.status === "error") {
            const errMsg = result.error?.message || "Executor error";
            const fallbackEdge = findFallbackEdge(edges, nodeId);
            if (fallbackEdge && nodeIds.has(fallbackEdge.targetNodeId)) {
              throw new Error(errMsg);
            }
            output = { error: errMsg, ...result.output };
          } else {
            output = result.output;
          }
        } catch (execErr: any) {
          const fb = findFallbackEdge(edges, nodeId);
          if (fb && nodeIds.has(fb.targetNodeId)) {
            throw execErr;
          }
          // Real execution errors should fail the node, not silently mock
          const errMsg = (execErr as Error).message || "Executor error";
          const isRealError =
            errMsg.includes("Missing required fields") ||
            errMsg.includes("Invalid API Key") ||
            errMsg.includes("API key") ||
            errMsg.includes("No AI API key") ||
            errMsg.includes("Authentication") ||
            errMsg.includes("401") ||
            errMsg.includes("403");
          if (isRealError) {
            throw execErr;
          }
          // Non-critical errors — fall back to mock output for demo compatibility
          console.warn(`[execution] Executor for "${executorKey}" threw, falling back to mock: ${errMsg}`);
          output = generateNodeOutput(node);
        }
      } else {
        // No executor found - fall back to existing mock data
        output = await executeIntegrationNode(resolvedExec, node, workspaceId);
      }

      if (isEntryTriggerNode(node)) {
        output = enrichEntryOutput(output, triggerPayload);
      }

      const executionTimeMs = Date.now() - startTime;

      if (
        workspaceId &&
        workflowIdForArtifact &&
        isArtifactWriterNode(node)
      ) {
        const cfg = (node.config || {}) as Record<string, any>;
        const name =
          typeof cfg.name === "string" && cfg.name.length > 0
            ? cfg.name
            : `artifact-${Date.now()}.json`;
        try {
          const created = await prisma.artifact.create({
            data: {
              workspaceId,
              workflowId: workflowIdForArtifact,
              runId,
              nodeId,
              name,
              mimeType: cfg.format === "json" ? "application/json" : "text/plain",
              sizeBytes: Buffer.byteLength(JSON.stringify(output), "utf8"),
              metadata: {
                format: cfg.format ?? "json",
                public: cfg.public ?? false,
              } as Prisma.InputJsonValue,
            },
          });
          output = {
            ...(typeof output === "object" && output !== null ? output : {}),
            artifactId: created.id,
            artifactName: created.name,
            stored: true,
            size: created.sizeBytes ?? undefined,
          };
        } catch (e: any) {
          console.error(
            "[execution] prisma.artifact.create failed (artifact library will stay empty until DB is fixed):",
            e?.message || e,
          );
          output = {
            ...(typeof output === "object" && output !== null ? output : {}),
            stored: false,
            libraryPersistFailed: true,
            persistError:
              e?.message ||
              "Could not save artifact row. Run `npx prisma db push` (or migrate) so the Artifact table exists.",
          };
        }
      }

      outputMap.set(nodeId, output);

      await prisma.runStep.updateMany({
        where: { runId, nodeId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          executionTimeMs,
          inputPayload: stepInput as Prisma.InputJsonValue,
          outputPayload: output as Prisma.InputJsonValue,
          reasoningSummary: getReasoningSummary(node, output),
          agentName: node.category === "AI_AGENT" ? node.label : null,
        },
      });

      broadcastRunUpdate({
        type: "step_completed",
        runId,
        nodeId,
        nodeLabel: node.label || node.nodeType || nodeId,
        status: "COMPLETED",
        executionTimeMs,
        timestamp: new Date().toISOString(),
      });

      // Queue next nodes only on success
      const nextNodes = adjacency.get(nodeId) || [];
      for (const next of nextNodes) {
        queue.push(next);
      }
    } catch (nodeErr: any) {
      const executionTimeMs = Date.now() - startTime;
      console.error(`Node ${node.label || nodeId} failed:`, nodeErr);

      await prisma.runStep.updateMany({
        where: { runId, nodeId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          executionTimeMs,
          error: nodeErr.message || "Node execution failed",
          outputPayload: {
            error: nodeErr.message || "Node execution failed",
            nodeId,
            nodeLabel: node.label || node.nodeType,
          },
        },
      });

      broadcastRunUpdate({
        type: "step_failed",
        runId,
        nodeId,
        nodeLabel: node.label || node.nodeType || nodeId,
        error: nodeErr.message || "Node execution failed",
        executionTimeMs,
        timestamp: new Date().toISOString(),
      });

      // Self-healing: check for fallback edges and route to alternate node
      const fallbackEdge = findFallbackEdge(edges, nodeId);
      if (fallbackEdge && nodeIds.has(fallbackEdge.targetNodeId)) {
        const fallbackNodeId = fallbackEdge.targetNodeId;
        const fallbackNode = nodes.find((n) => n.id === fallbackNodeId);
        const fallbackLabel = fallbackNode?.label || fallbackNode?.nodeType || fallbackNodeId;
        const failedLabel = node.label || node.nodeType || nodeId;
        const errorMsg = nodeErr.message || "Node execution failed";

        console.log(
          `[self-healing] Node "${failedLabel}" failed. Routing to fallback node "${fallbackLabel}".`,
        );

        // Create a RunStep documenting the self-healing decision
        await prisma.runStep.create({
          data: {
            runId,
            nodeId: fallbackNodeId,
            status: "PENDING",
            reasoningSummary: `Node "${failedLabel}" failed with error: ${errorMsg}. Self-healed by routing to fallback node "${fallbackLabel}".`,
          },
        });

        // Pass the failed node's error info as input context for the fallback node
        outputMap.set(nodeId, {
          error: errorMsg,
          fallback_triggered: true,
          original_node: failedLabel,
        });

        broadcastRunUpdate({
          type: "step_fallback",
          runId,
          nodeId: fallbackNodeId,
          nodeLabel: fallbackLabel,
          reasoningSummary: `Node "${failedLabel}" failed with error: ${errorMsg}. Self-healed by routing to fallback node "${fallbackLabel}".`,
          timestamp: new Date().toISOString(),
        });

        // Queue the fallback node for execution
        queue.push(fallbackNodeId);
      }
      // If no fallback edge, downstream is skipped (original behavior)
    }
  }

  // Check if any steps failed and reflect that in the run status
  // Nodes that self-healed via fallback are still marked FAILED, but if all
  // fallback paths completed we consider the overall run as COMPLETED.
  const failedSteps = await prisma.runStep.count({
    where: { runId, status: "FAILED" },
  });

  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: failedSteps > 0 ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
      ...(failedSteps > 0 && { error: `${failedSteps} node(s) failed during execution` }),
    },
  });

  broadcastRunUpdate({
    type: failedSteps > 0 ? "run_failed" : "run_completed",
    runId,
    ...(failedSteps > 0 && { error: `${failedSteps} node(s) failed during execution` }),
    timestamp: new Date().toISOString(),
  });
}

async function resumeExecution(runId: string, nodes: any[], edges: any[], startNodeIds: string[]) {
  const runRecord = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { workflow: true },
  });
  const triggerPayload = normalizeTriggerPayload(runRecord?.triggerData);
  const workspaceId = runRecord?.workflow?.workspaceId;
  const workflowIdForArtifact = runRecord?.workflowId;

  const nodeIds = new Set(nodes.map((n) => n.id));
  const parents = buildParentMap(edges, nodeIds, nodes);
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) continue;
    const sources = adjacency.get(edge.sourceNodeId) || [];
    sources.push(edge.targetNodeId);
    adjacency.set(edge.sourceNodeId, sources);
  }

  const queue = [...startNodeIds];
  const visited = new Set<string>();
  const WORKFLOW_TIMEOUT_MS = 5 * 60 * 1000;
  const workflowStartTime = Date.now();

  const completedSteps = await prisma.runStep.findMany({
    where: { runId, status: "COMPLETED" },
    select: { nodeId: true, outputPayload: true },
  });
  completedSteps.forEach((s) => { if (s.nodeId) visited.add(s.nodeId); });

  const outputMap = new Map<string, unknown>();
  for (const s of completedSteps) {
    if (s.nodeId && s.outputPayload !== null && s.outputPayload !== undefined) {
      outputMap.set(s.nodeId, s.outputPayload as unknown);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    if (Date.now() - workflowStartTime > WORKFLOW_TIMEOUT_MS) {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: { status: "FAILED", error: "Workflow execution timed out", completedAt: new Date() },
      });
      return;
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const parentIds = parents.get(nodeId) || [];
    const stepInput = computeStepInput(
      node,
      triggerPayload,
      parentIds,
      outputMap,
    );

    const startTime = Date.now();
    await prisma.runStep.updateMany({
      where: { runId, nodeId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));
      const executionTimeMs = Date.now() - startTime;
      const resolvedResume =
        resolveComponentId(String(node.nodeType || "")) ||
        resolveComponentId(String(node.metadata?.componentId || ""));
      let output: any = await executeIntegrationNode(resolvedResume, node, workspaceId);
      if (isEntryTriggerNode(node)) {
        output = enrichEntryOutput(output, triggerPayload);
      }

      if (
        workspaceId &&
        workflowIdForArtifact &&
        isArtifactWriterNode(node)
      ) {
        const cfg = (node.config || {}) as Record<string, any>;
        const name =
          typeof cfg.name === "string" && cfg.name.length > 0
            ? cfg.name
            : `artifact-${Date.now()}.json`;
        try {
          const created = await prisma.artifact.create({
            data: {
              workspaceId,
              workflowId: workflowIdForArtifact,
              runId,
              nodeId,
              name,
              mimeType: cfg.format === "json" ? "application/json" : "text/plain",
              sizeBytes: Buffer.byteLength(JSON.stringify(output), "utf8"),
              metadata: {
                format: cfg.format ?? "json",
                public: cfg.public ?? false,
              } as Prisma.InputJsonValue,
            },
          });
          output = {
            ...(typeof output === "object" && output !== null ? output : {}),
            artifactId: created.id,
            artifactName: created.name,
            stored: true,
            size: created.sizeBytes ?? undefined,
          };
        } catch (e: any) {
          console.error(
            "[execution] prisma.artifact.create failed (resume path):",
            e?.message || e,
          );
          output = {
            ...(typeof output === "object" && output !== null ? output : {}),
            stored: false,
            libraryPersistFailed: true,
            persistError:
              e?.message ||
              "Could not save artifact row. Run `npx prisma db push` (or migrate) so the Artifact table exists.",
          };
        }
      }

      outputMap.set(nodeId, output);

      await prisma.runStep.updateMany({
        where: { runId, nodeId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          executionTimeMs,
          inputPayload: stepInput as Prisma.InputJsonValue,
          outputPayload: output as Prisma.InputJsonValue,
        },
      });

      const nextNodes = adjacency.get(nodeId) || [];
      for (const next of nextNodes) queue.push(next);
    } catch (nodeErr: any) {
      const executionTimeMs = Date.now() - startTime;
      await prisma.runStep.updateMany({
        where: { runId, nodeId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          executionTimeMs,
          error: nodeErr.message || "Node execution failed",
        },
      });

      // Self-healing: check for fallback edges and route to alternate node
      const fallbackEdge = findFallbackEdge(edges, nodeId);
      if (fallbackEdge && nodeIds.has(fallbackEdge.targetNodeId)) {
        const fallbackNodeId = fallbackEdge.targetNodeId;
        const fallbackNode = nodes.find((n) => n.id === fallbackNodeId);
        const fallbackLabel = fallbackNode?.label || fallbackNode?.nodeType || fallbackNodeId;
        const failedLabel = node.label || node.nodeType || nodeId;
        const errorMsg = nodeErr.message || "Node execution failed";

        console.log(
          `[self-healing] Node "${failedLabel}" failed (resume). Routing to fallback node "${fallbackLabel}".`,
        );

        await prisma.runStep.create({
          data: {
            runId,
            nodeId: fallbackNodeId,
            status: "PENDING",
            reasoningSummary: `Node "${failedLabel}" failed with error: ${errorMsg}. Self-healed by routing to fallback node "${fallbackLabel}".`,
          },
        });

        outputMap.set(nodeId, {
          error: errorMsg,
          fallback_triggered: true,
          original_node: failedLabel,
        });

        queue.push(fallbackNodeId);
      }
    }
  }

  const failedSteps = await prisma.runStep.count({ where: { runId, status: "FAILED" } });
  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: failedSteps > 0 ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
      ...(failedSteps > 0 && { error: `${failedSteps} node(s) failed during execution` }),
    },
  });
}

function generateNodeOutput(node: any): any {
  const outputs: Record<string, any> = {
    // Legacy UPPER_SNAKE keys
    WEBHOOK_TRIGGER: { event: "webhook_received", payload: { data: "sample" } },
    SCHEDULE_TRIGGER: { event: "schedule_fired", timestamp: new Date().toISOString() },
    EXTRACTION_AGENT: { extracted: { entities: ["Task 1", "Task 2"], confidence: 0.95 } },
    SUMMARIZATION_AGENT: { summary: "Meeting covered Q4 performance, new hires, and product roadmap updates." },
    CLASSIFICATION_AGENT: { category: "high_priority", confidence: 0.92, labels: ["urgent", "customer-facing"] },
    REASONING_AGENT: { decision: "approve", reasoning: "All criteria met. Revenue target exceeded by 15%." },
    DECISION_AGENT: { branch: "true", condition_met: true, evaluated: "revenue > threshold" },
    SLACK_SEND: { message_sent: true, channel: "#general", ts: Date.now().toString() },
    EMAIL_SEND: { email_sent: true, to: "user@example.com", subject: "Workflow notification" },
    HTTP_REQUEST: { status: 200, body: { result: "success" } },
    IF_CONDITION: { condition: true, branch: "then" },
    LOOP: { iterations: 3, completed: true },
    DELAY: { waited_ms: 5000 },
    API_CALL: { status: 200, response: { id: "123", status: "ok" } },
    DB_WRITE: { rows_affected: 1, table: "records" },
    // Catalog kebab-case component IDs
    "entry-point": { event: "workflow_started", payload: { data: "sample" }, metadata: { triggeredAt: new Date().toISOString() } },
    "http-request": { status: 200, headers: { "content-type": "application/json" }, data: { result: "success" } },
    "slack-send": { ok: true, channel: node.config?.channel || "#general", ts: Date.now().toString() },
    "email-send": { messageId: `msg-${Date.now()}`, accepted: [node.config?.to || "user@example.com"] },
    "db-query": { rows: [{ id: 1, name: "Sample" }], rowCount: 1 },
    "if-condition": { result: true, payload: {} },
    "switch-case": { matchedCase: "typeA", payload: {} },
    "loop": { results: [{ item: 1 }, { item: 2 }], totalProcessed: 2 },
    "ai-agent": { content: "AI agent processed the input and generated a response.", usage: { promptTokens: 150, completionTokens: 80 } },
    "text-transform": { result: "Transformed text output" },
    "delay": { payload: {}, delayedMs: node.config?.durationMs || 5000 },
    "error-handler": { handled: true, result: {} },
    "approval": { approved: true, approver: "admin@company.com", comment: "Looks good" },
    "artifact-writer": { artifactId: `art-${Date.now()}`, size: 1024 },
    "webhook-response": { sent: true },
    github: {
      ok: true,
      simulated: true,
      operation: node.config?.operation || "get_repository",
      fullName: `${node.config?.owner || "octocat"}/${node.config?.repo || "Hello-World"}`,
      stars: 42,
      openIssues: 3,
      defaultBranch: "main",
    },
    "google-calendar": {
      ok: true,
      simulated: true,
      operation: node.config?.operation || "list_events",
      calendarId: node.config?.calendarId || "primary",
      events: [
        { id: "evt-sim-1", summary: "Sample event", start: "2025-03-20T10:00:00Z", end: "2025-03-20T11:00:00Z" },
      ],
      note: "Simulated Calendar response. Wire Google Calendar API v3 for production.",
    },
    "google-meet": {
      ok: true,
      simulated: true,
      operation: node.config?.operation || "create_scheduled_meeting",
      eventId: "sim-event-meet-1",
      meetLink: "https://meet.google.com/xxx-xxxx-xxx",
      htmlLink: "https://www.google.com/calendar/event?eid=simulated",
      note: "Simulated Meet link. Real flows use Calendar API conferenceData (hangoutsMeet).",
    },
    "google-docs": {
      ok: true,
      simulated: true,
      operation: node.config?.operation || "get_document",
      documentId: node.config?.documentId || "sim-doc-id",
      title: node.config?.newDocumentTitle || "Sample Doc",
      textPreview: "Simulated document body. Connect Google Docs API v1 for live reads/writes.",
    },
    "google-sheets": {
      ok: true,
      simulated: true,
      operation: node.config?.operation || "read_range",
      spreadsheetId: node.config?.spreadsheetId || "sim-sheet-id",
      range: node.config?.rangeA1 || "Sheet1!A1:D10",
      values: [
        ["Name", "Score"],
        ["Alice", "92"],
      ],
      note: "Simulated Sheets values. Use spreadsheets.values.* for production.",
    },
    gmail: {
      ok: true,
      simulated: true,
      operation: node.config?.operation || "send_email",
      messageId: `msg-${Date.now()}`,
      to: node.config?.to || "user@example.com",
      subject: node.config?.subject || "Workflow notification",
      note: "Simulated Gmail response. Connect Google account for live emails.",
    },
  };

  const componentId = node.metadata?.componentId || "";
  const resolvedId = resolveComponentId(node.nodeType) || resolveComponentId(componentId);
  return (
    outputs[node.nodeType] ||
    outputs[componentId] ||
    (resolvedId ? outputs[resolvedId] : null) ||
    { result: "completed", nodeType: node.nodeType }
  );
}

function getReasoningSummary(node: any, executionOutput: any): string | null {
  const cat = (node.category || "").toLowerCase();
  if (cat !== "ai_agent" && cat !== "ai") return null;

  // Use real reasoning from the executor output if available
  if (executionOutput?.reasoning) return executionOutput.reasoning;
  if (executionOutput?.reasoning_summary) return executionOutput.reasoning_summary;
  if (executionOutput?.content && typeof executionOutput.content === "string") {
    // Truncate long AI responses to a summary
    return executionOutput.content.length > 300
      ? executionOutput.content.slice(0, 300) + "..."
      : executionOutput.content;
  }
  return null;
}

// Get run details
router.get(
  "/run/:runId",
  dualAuthMiddleware([ApiScope.READ]),
  async (req: AuthRequest, res) => {
  try {
    const run = await prisma.workflowRun.findUnique({
      where: { id: req.params.runId },
      include: {
        steps: {
          include: {
            node: true,
          },
          orderBy: { startedAt: "asc" },
        },
        approvals: true,
        workflow: {
          include: { nodes: true, edges: true },
        },
      },
    });

    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }

    const gate = await assertApiKeyCanAccessWorkflowWorkspace(
      req,
      run.workflow.workspaceId,
    );
    if (!gate.ok) {
      return res.status(gate.status).json(gate.body);
    }

    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
},
);

// List runs for a workflow
router.get(
  "/runs/:workflowId",
  dualAuthMiddleware([ApiScope.READ]),
  async (req: AuthRequest, res) => {
    try {
      const wf = await prisma.workflow.findUnique({
        where: { id: req.params.workflowId },
        select: { workspaceId: true },
      });
      if (!wf) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      const gate = await assertApiKeyCanAccessWorkflowWorkspace(req, wf.workspaceId);
      if (!gate.ok) {
        return res.status(gate.status).json(gate.body);
      }

      const runs = await prisma.workflowRun.findMany({
        where: { workflowId: req.params.workflowId },
        include: {
          steps: {
            select: {
              id: true,
              nodeId: true,
              status: true,
              executionTimeMs: true,
              agentName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json(runs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Get all recent runs across all workflows
router.get("/runs", dualAuthMiddleware([ApiScope.READ]), async (req: AuthRequest, res) => {
  try {
    let workspaceId: string | null = null;

    if (req.authMethod === "api_key" && req.apiKeyWorkspaceId) {
      workspaceId = req.apiKeyWorkspaceId;
    } else {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId },
      });
      workspaceId = membership?.workspaceId ?? null;
    }

    if (!workspaceId) {
      return res.json([]);
    }

    const runs = await prisma.workflowRun.findMany({
      where: {
        workflow: { workspaceId },
      },
      include: {
        workflow: { select: { id: true, name: true } },
        steps: {
          select: {
            id: true,
            status: true,
            executionTimeMs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get step logs
router.get("/logs/:runId", dualAuthMiddleware([ApiScope.READ]), async (req: AuthRequest, res) => {
  try {
    const wsId = await loadRunWorkspaceId(req.params.runId);
    if (!wsId) {
      return res.status(404).json({ error: "Run not found" });
    }
    const gate = await assertApiKeyCanAccessWorkflowWorkspace(req, wsId);
    if (!gate.ok) {
      return res.status(gate.status).json(gate.body);
    }

    const steps = await prisma.runStep.findMany({
      where: { runId: req.params.runId },
      include: {
        node: true,
      },
      orderBy: { startedAt: "asc" },
    });

    res.json(steps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SSE endpoint for streaming run events in real-time
router.get("/events/:runId", dualAuthMiddleware([ApiScope.READ]), async (req: AuthRequest, res) => {
  const { runId } = req.params;

  const wsId = await loadRunWorkspaceId(runId);
  if (!wsId) {
    return res.status(404).json({ error: "Run not found" });
  }
  const gate = await assertApiKeyCanAccessWorkflowWorkspace(req, wsId);
  if (!gate.ok) {
    return res.status(gate.status).json(gate.body);
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send initial connection event
  res.write(`: connected\n\n`);

  // Helper function to send SSE events
  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Helper function to send keep-alive comments
  const sendKeepAlive = () => {
    res.write(": keep-alive\n\n");
  };

  // In production, this would subscribe to actual execution events
  // For now, we'll simulate events by polling and streaming updates
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: {
      steps: {
        include: { node: true },
        orderBy: { startedAt: "asc" },
      },
    },
  });

  if (!run) {
    sendEvent("error", { message: "Run not found" });
    res.end();
    return;
  }

  // Stream current status immediately
  sendEvent("run.status", {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    stepsCount: run.steps.length,
  });

  // Stream step events
  run.steps.forEach((step) => {
    sendEvent("step.status", {
      stepId: step.id,
      nodeId: step.nodeId,
      nodeLabel: step.node?.label,
      status: step.status,
      startedAt: step.startedAt,
      completedAt: step.completedAt,
      executionTimeMs: step.executionTimeMs,
      inputPayload: step.inputPayload,
      outputPayload: step.outputPayload,
      error: step.error,
    });
  });

  // In a real implementation with a proper execution engine:
  // - Subscribe to the run's event stream from a message queue (Redis, etc.)
  // - Forward events to the client as they arrive
  // - Monitor for connection closure and clean up subscriptions
  // - Send periodic keep-alive comments

  // For now, simulate periodic updates and keep-alive
  let eventCount = 0;
  const keepAliveInterval = setInterval(() => {
    sendKeepAlive();
    eventCount++;

    // After some keep-alive cycles, check for status changes
    if (eventCount % 5 === 0) {
      prisma.workflowRun
        .findUnique({
          where: { id: runId },
          select: { status: true },
        })
        .then((updatedRun) => {
          if (updatedRun && updatedRun.status !== run.status) {
            sendEvent("run.status", {
              id: runId,
              status: updatedRun.status,
              timestamp: new Date().toISOString(),
            });
            run.status = updatedRun.status;
          }
        })
        .catch(() => {
          // Ignore errors in keep-alive polling
        });
    }
  }, 15000); // Send keep-alive every 15 seconds

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(keepAliveInterval);
  });

  req.on("error", () => {
    clearInterval(keepAliveInterval);
  });
});

// ─── SLA Health Monitoring ────────────────────────────────────────
router.get(
  "/sla-health",
  dualAuthMiddleware([ApiScope.READ]),
  async (req: AuthRequest, res) => {
    try {
      const workflowId = req.query.workflowId as string;
      if (!workflowId) {
        return res.status(400).json({ error: "workflowId query parameter is required" });
      }

      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        select: { id: true, name: true, workspaceId: true, nodes: true },
      });

      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      const gate = await assertApiKeyCanAccessWorkflowWorkspace(req, workflow.workspaceId);
      if (!gate.ok) {
        return res.status(gate.status).json(gate.body);
      }

      // Get last 20 completed/failed runs
      const recentRuns = await prisma.workflowRun.findMany({
        where: {
          workflowId,
          status: { in: ["COMPLETED", "FAILED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true },
      });

      if (recentRuns.length === 0) {
        return res.json({
          workflowId: workflow.id,
          workflowName: workflow.name,
          overallHealth: "healthy" as const,
          totalRuns: 0,
          nodeMetrics: [],
          recentBreaches: [],
        });
      }

      const runIds = recentRuns.map((r) => r.id);

      // Get all steps for these runs that have a nodeId and execution time
      const steps = await prisma.runStep.findMany({
        where: {
          runId: { in: runIds },
          nodeId: { not: null },
          executionTimeMs: { not: null },
        },
        select: {
          runId: true,
          nodeId: true,
          executionTimeMs: true,
          completedAt: true,
          node: {
            select: { id: true, label: true, nodeType: true, config: true },
          },
        },
      });

      // Group steps by nodeId
      const nodeStepMap = new Map<
        string,
        {
          node: { id: string; label: string; nodeType: string; config: any };
          execTimes: number[];
          stepDetails: { runId: string; executionTimeMs: number; timestamp: string }[];
        }
      >();

      for (const step of steps) {
        if (!step.nodeId || !step.node || step.executionTimeMs == null) continue;
        let entry = nodeStepMap.get(step.nodeId);
        if (!entry) {
          entry = { node: step.node, execTimes: [], stepDetails: [] };
          nodeStepMap.set(step.nodeId, entry);
        }
        entry.execTimes.push(step.executionTimeMs);
        entry.stepDetails.push({
          runId: step.runId,
          executionTimeMs: step.executionTimeMs,
          timestamp: step.completedAt?.toISOString() ?? new Date().toISOString(),
        });
      }

      const nodeMetrics: Array<{
        nodeId: string;
        nodeLabel: string;
        nodeType: string;
        avgExecutionTimeMs: number;
        maxExecutionTimeMs: number;
        expectedDurationMs: number;
        slaStatus: "healthy" | "warning" | "breach";
        breachCount: number;
        totalExecutions: number;
      }> = [];

      const recentBreaches: Array<{
        runId: string;
        nodeLabel: string;
        executionTimeMs: number;
        expectedMs: number;
        exceededByMs: number;
        timestamp: string;
      }> = [];

      let overallHealth: "healthy" | "warning" | "breach" = "healthy";

      for (const [, entry] of nodeStepMap) {
        const { node, execTimes, stepDetails } = entry;
        const config = (node.config && typeof node.config === "object") ? node.config as Record<string, any> : {};
        const expectedDurationMs = Number(config.expectedDurationMs) || 30000;

        const avg = execTimes.reduce((a, b) => a + b, 0) / execTimes.length;
        const max = Math.max(...execTimes);
        const breachCount = execTimes.filter((t) => t > expectedDurationMs).length;

        let slaStatus: "healthy" | "warning" | "breach" = "healthy";
        if (avg > expectedDurationMs) {
          slaStatus = "breach";
        } else if (avg > expectedDurationMs * 0.8) {
          slaStatus = "warning";
        }

        if (slaStatus === "breach") overallHealth = "breach";
        else if (slaStatus === "warning" && overallHealth !== "breach") overallHealth = "warning";

        nodeMetrics.push({
          nodeId: node.id,
          nodeLabel: node.label,
          nodeType: node.nodeType,
          avgExecutionTimeMs: Math.round(avg),
          maxExecutionTimeMs: max,
          expectedDurationMs,
          slaStatus,
          breachCount,
          totalExecutions: execTimes.length,
        });

        for (const detail of stepDetails) {
          if (detail.executionTimeMs > expectedDurationMs) {
            recentBreaches.push({
              runId: detail.runId,
              nodeLabel: node.label,
              executionTimeMs: detail.executionTimeMs,
              expectedMs: expectedDurationMs,
              exceededByMs: detail.executionTimeMs - expectedDurationMs,
              timestamp: detail.timestamp,
            });
          }
        }
      }

      recentBreaches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({
        workflowId: workflow.id,
        workflowName: workflow.name,
        overallHealth,
        totalRuns: recentRuns.length,
        nodeMetrics,
        recentBreaches: recentBreaches.slice(0, 20),
      });
    } catch (err: any) {
      console.error("SLA health error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ─── Decision Audit Trail ─────────────────────────────────────────
router.get(
  "/runs/:runId/decisions",
  dualAuthMiddleware([ApiScope.READ]),
  async (req: AuthRequest, res) => {
    try {
      const { runId } = req.params;

      const wsId = await loadRunWorkspaceId(runId);
      if (!wsId) {
        return res.status(404).json({ error: "Run not found" });
      }
      const gate = await assertApiKeyCanAccessWorkflowWorkspace(req, wsId);
      if (!gate.ok) {
        return res.status(gate.status).json(gate.body);
      }

      const run = await prisma.workflowRun.findUnique({
        where: { id: runId },
        include: {
          workflow: { select: { id: true, name: true, edges: true } },
          steps: {
            where: {
              OR: [
                { reasoningSummary: { not: null } },
                { agentName: { not: null } },
              ],
            },
            include: {
              node: {
                select: {
                  id: true,
                  label: true,
                  nodeType: true,
                  category: true,
                },
              },
            },
            orderBy: { startedAt: "asc" },
          },
        },
      });

      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }

      // Build a set of node IDs that are targets of fallback edges
      const fallbackTargetIds = new Set<string>();
      for (const edge of (run.workflow.edges || []) as any[]) {
        const isFallbackEdge =
          (edge.condition &&
            typeof edge.condition === "object" &&
            (edge.condition as Record<string, unknown>).type === "fallback") ||
          (typeof edge.label === "string" &&
            edge.label.toLowerCase().includes("fallback"));
        if (isFallbackEdge) {
          fallbackTargetIds.add(edge.targetNodeId);
        }
      }

      // Truncate large payloads for the summary view
      const truncatePayload = (payload: any, maxKeys = 5): any => {
        if (!payload || typeof payload !== "object") return payload;
        const keys = Object.keys(payload);
        if (keys.length <= maxKeys) return payload;
        const truncated: Record<string, unknown> = {};
        for (const key of keys.slice(0, maxKeys)) {
          truncated[key] = payload[key];
        }
        truncated["__truncated"] = `${keys.length - maxKeys} more fields`;
        return truncated;
      };

      const decisions = run.steps.map((step) => ({
        stepId: step.id,
        nodeId: step.nodeId || "",
        nodeLabel: step.node?.label || step.node?.nodeType || "Unknown",
        agentName: step.agentName || "System",
        status: step.status,
        reasoningSummary: step.reasoningSummary || "",
        inputSummary: truncatePayload(step.inputPayload as any),
        outputSummary: truncatePayload(step.outputPayload as any),
        executionTimeMs: step.executionTimeMs || 0,
        retryCount: step.retryCount,
        timestamp:
          step.startedAt?.toISOString() || step.createdAt.toISOString(),
        isFallback: step.nodeId
          ? fallbackTargetIds.has(step.nodeId)
          : false,
      }));

      res.json({
        runId: run.id,
        workflowName: run.workflow.name,
        totalDecisions: decisions.length,
        decisions,
      });
    } catch (err: any) {
      console.error("Decision trail error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

/**
 * Resume workflow execution after an approval node is approved.
 * Loads the workflow, resolves secrets, and continues BFS from the children
 * of the approved node.
 */
export async function resumeAfterApproval(runId: string, approvedNodeId: string): Promise<void> {
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { workflow: { include: { nodes: true, edges: true } } },
  });
  if (!run || !run.workflow) return;

  const workflow = run.workflow;
  const secretMap = await getWorkspaceSecretsMap(workflow.workspaceId);
  const nodesWithSecrets = applySecretsToWorkflowNodes(workflow.nodes, secretMap);

  // Find child nodes of the approved node
  const childNodeIds: string[] = [];
  for (const edge of workflow.edges) {
    if (edge.sourceNodeId === approvedNodeId) {
      childNodeIds.push(edge.targetNodeId);
    }
  }

  if (childNodeIds.length === 0) {
    // No nodes after approval — workflow is done
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    broadcastRunUpdate({
      type: "run_completed",
      runId,
      status: "COMPLETED",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Resume execution — re-run BFS, pre-marking completed nodes as visited.
  // Also mark the just-approved node as COMPLETED so BFS skips it and processes its children.
  console.log(`[resumeAfterApproval] Resuming run ${runId} after node ${approvedNodeId}, children: ${childNodeIds.join(", ")}`);
  try {
    await simulateExecution(runId, nodesWithSecrets, workflow.edges);
    console.log(`[resumeAfterApproval] Run ${runId} resumed successfully`);
  } catch (err: any) {
    console.error(`[resumeAfterApproval] Resumed run ${runId} failed:`, err);
    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        error: err.message || "Resumed execution failed",
        completedAt: new Date(),
      },
    }).catch(() => {});
  }
}

export const executionRouter = router;
