import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import { resolveComponentId } from "./componentCatalog";

const router = Router();

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

// Execute a workflow
router.post(
  "/run/:workflowId",
  authMiddleware,
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

      if (workflow.nodes.length === 0) {
        return res.status(400).json({ error: "Workflow has no nodes. Add at least one node before running." });
      }

      // Validate node configs before creating a run
      const configError = validateNodeConfigs(workflow.nodes);
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

      // Create pending steps for each node in a single transaction
      await prisma.$transaction(
        workflow.nodes.map((node) =>
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
      simulateExecution(run.id, workflow.nodes, workflow.edges).catch(async (err) => {
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
router.post("/run/:runId/cancel", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const run = await prisma.workflowRun.findUnique({
      where: { id: req.params.runId },
    });

    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }

    if (run.status !== "RUNNING" && run.status !== "WAITING_APPROVAL") {
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
});

// Handle approval decision
router.post("/run/:runId/approve", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { approved, comment } = req.body;
    const { runId } = req.params;

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
          // Continue execution from next nodes (fire-and-forget with error handling)
          resumeExecution(runId, run.workflow.nodes, run.workflow.edges, nextNodes).catch(async (err) => {
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
});

// Simulated execution engine
async function simulateExecution(runId: string, nodes: any[], edges: any[]) {
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
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) continue; // skip orphaned edges
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

  // BFS execution
  const WORKFLOW_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const workflowStartTime = Date.now();

  const queue = [triggerNode.id];
  const visited = new Set<string>();

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

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Check for approval nodes
    if (node.nodeType === "APPROVAL" || node.nodeType === "approval" || node.metadata?.componentId === "approval") {
      await prisma.runStep.updateMany({
        where: { runId, nodeId },
        data: {
          status: "WAITING_APPROVAL",
          startedAt: new Date(),
          inputPayload: { message: "Waiting for human approval" },
        },
      });

      await prisma.approval.create({
        data: {
          runId,
          nodeId,
          status: "PENDING",
          data: node.config,
        },
      });

      await prisma.workflowRun.update({
        where: { id: runId },
        data: { status: "WAITING_APPROVAL" },
      });
      return; // Pause execution
    }

    // Simulate node execution
    const startTime = Date.now();

    await prisma.runStep.updateMany({
      where: { runId, nodeId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    try {
      // Simulate processing delay
      await new Promise((resolve) =>
        setTimeout(resolve, 500 + Math.random() * 1500),
      );

      const executionTimeMs = Date.now() - startTime;

      // Generate simulated output based on node type
      const output = generateNodeOutput(node);

      await prisma.runStep.updateMany({
        where: { runId, nodeId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          executionTimeMs,
          inputPayload: { triggerData: "sample input data" },
          outputPayload: output,
          reasoningSummary: getReasoningSummary(node),
          agentName: node.category === "AI_AGENT" ? node.label : null,
        },
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
      // Continue BFS - do not push next nodes so downstream is skipped
    }
  }

  // Check if any steps failed and reflect that in the run status
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
}

async function resumeExecution(runId: string, nodes: any[], edges: any[], startNodeIds: string[]) {
  const nodeIds = new Set(nodes.map((n) => n.id));
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

  // Get already-completed steps to skip
  const completedSteps = await prisma.runStep.findMany({
    where: { runId, status: "COMPLETED" },
    select: { nodeId: true },
  });
  completedSteps.forEach((s) => visited.add(s.nodeId));

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

    const startTime = Date.now();
    await prisma.runStep.updateMany({
      where: { runId, nodeId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));
      const executionTimeMs = Date.now() - startTime;
      const output = generateNodeOutput(node);

      await prisma.runStep.updateMany({
        where: { runId, nodeId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          executionTimeMs,
          outputPayload: output,
        },
      });

      const nextNodes = adjacency.get(nodeId) || [];
      for (const next of nextNodes) queue.push(next);
    } catch (nodeErr: any) {
      await prisma.runStep.updateMany({
        where: { runId, nodeId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
          error: nodeErr.message || "Node execution failed",
        },
      });
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

function getReasoningSummary(node: any): string | null {
  const cat = (node.category || "").toLowerCase();
  if (cat !== "ai_agent" && cat !== "ai") return null;

  const summaries: Record<string, string> = {
    EXTRACTION_AGENT: "Analyzed input text using NER model. Identified 2 task entities with high confidence scores.",
    SUMMARIZATION_AGENT: "Processed 2,450 tokens of meeting transcript. Generated concise summary using abstractive summarization.",
    CLASSIFICATION_AGENT: "Applied multi-label classification model. Top category: high_priority (0.92 confidence).",
    REASONING_AGENT: "Evaluated 5 criteria against business rules. All conditions satisfied. Recommending approval.",
    DECISION_AGENT: "Evaluated conditional expression. Branch 'true' selected based on input data.",
    VERIFICATION_AGENT: "Ran 3 validation checks against input data. All checks passed.",
    COMPLIANCE_AGENT: "Verified document against 12 compliance rules. No violations detected.",
    "ai-agent": "LLM agent processed input using configured model and system prompt. Generated structured response.",
    "text-transform": "Applied text transformation operation to input data.",
  };

  const componentId = node.metadata?.componentId || "";
  const resolvedId = resolveComponentId(node.nodeType) || resolveComponentId(componentId);
  return (
    summaries[node.nodeType] ||
    summaries[componentId] ||
    (resolvedId ? summaries[resolvedId] : null) ||
    "Agent processed input and generated structured output."
  );
}

// Get run details
router.get("/run/:runId", authMiddleware, async (req: AuthRequest, res) => {
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

    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List runs for a workflow
router.get(
  "/runs/:workflowId",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
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
router.get("/runs", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId },
    });

    if (!membership) {
      return res.json([]);
    }

    const runs = await prisma.workflowRun.findMany({
      where: {
        workflow: { workspaceId: membership.workspaceId },
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
router.get("/logs/:runId", authMiddleware, async (req: AuthRequest, res) => {
  try {
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
router.get("/events/:runId", authMiddleware, async (req: AuthRequest, res) => {
  const { runId } = req.params;

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
  // - Subscribe to the run's event stream from a message queue (Kafka, Redis, etc.)
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

export const executionRouter = router;
