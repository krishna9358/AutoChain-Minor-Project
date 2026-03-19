import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";

const router = Router();

// Execute a workflow
router.post(
  "/run/:workflowId",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { workflowId } = req.params;
      const { triggerData } = req.body;

      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { nodes: true, edges: true },
      });

      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
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

      // Create pending steps for each node
      for (const node of workflow.nodes) {
        await prisma.runStep.create({
          data: {
            runId: run.id,
            nodeId: node.id,
            status: "PENDING",
          },
        });
      }

      // Simulate execution (in production, use a job queue)
      simulateExecution(run.id, workflow.nodes, workflow.edges);

      // Audit log
      await prisma.auditLog.create({
        data: {
          workflowId,
          userId: req.userId!,
          action: "run.started",
          details: { runId: run.id },
        },
      });

      res.json(run);
    } catch (err: any) {
      console.error("Execute error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// Simulated execution engine
async function simulateExecution(runId: string, nodes: any[], edges: any[]) {
  // Find trigger/entry-point node (supports both legacy "TRIGGER" and catalog "input" categories)
  const triggerNode = nodes.find(
    (n) =>
      n.category === "TRIGGER" ||
      n.category === "input" ||
      n.nodeType === "WEBHOOK_TRIGGER" ||
      n.nodeType === "ENTRY_POINT" ||
      n.metadata?.componentId === "entry-point",
  );

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

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const sources = adjacency.get(edge.sourceNodeId) || [];
    sources.push(edge.targetNodeId);
    adjacency.set(edge.sourceNodeId, sources);
  }

  // BFS execution
  const queue = [triggerNode.id];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Check for approval nodes
    if (node.nodeType === "APPROVAL") {
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

    // Queue next nodes
    const nextNodes = adjacency.get(nodeId) || [];
    for (const next of nextNodes) {
      queue.push(next);
    }
  }

  // Mark run as completed
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

function generateNodeOutput(node: any): any {
  const outputs: Record<string, any> = {
    WEBHOOK_TRIGGER: { event: "webhook_received", payload: { data: "sample" } },
    SCHEDULE_TRIGGER: {
      event: "schedule_fired",
      timestamp: new Date().toISOString(),
    },
    EXTRACTION_AGENT: {
      extracted: { entities: ["Task 1", "Task 2"], confidence: 0.95 },
    },
    SUMMARIZATION_AGENT: {
      summary:
        "Meeting covered Q4 performance, new hires, and product roadmap updates.",
    },
    CLASSIFICATION_AGENT: {
      category: "high_priority",
      confidence: 0.92,
      labels: ["urgent", "customer-facing"],
    },
    REASONING_AGENT: {
      decision: "approve",
      reasoning: "All criteria met. Revenue target exceeded by 15%.",
    },
    DECISION_AGENT: {
      branch: "true",
      condition_met: true,
      evaluated: "revenue > threshold",
    },
    SLACK_SEND: {
      message_sent: true,
      channel: "#general",
      ts: Date.now().toString(),
    },
    EMAIL_SEND: {
      email_sent: true,
      to: "user@example.com",
      subject: "Workflow notification",
    },
    HTTP_REQUEST: { status: 200, body: { result: "success" } },
    IF_CONDITION: { condition: true, branch: "then" },
    LOOP: { iterations: 3, completed: true },
    DELAY: { waited_ms: 5000 },
    API_CALL: { status: 200, response: { id: "123", status: "ok" } },
    DB_WRITE: { rows_affected: 1, table: "records" },
  };

  return (
    outputs[node.nodeType] || { result: "completed", nodeType: node.nodeType }
  );
}

function getReasoningSummary(node: any): string | null {
  if (node.category !== "AI_AGENT") return null;

  const summaries: Record<string, string> = {
    EXTRACTION_AGENT:
      "Analyzed input text using NER model. Identified 2 task entities with high confidence scores.",
    SUMMARIZATION_AGENT:
      "Processed 2,450 tokens of meeting transcript. Generated concise summary using abstractive summarization.",
    CLASSIFICATION_AGENT:
      "Applied multi-label classification model. Top category: high_priority (0.92 confidence).",
    REASONING_AGENT:
      "Evaluated 5 criteria against business rules. All conditions satisfied. Recommending approval.",
    DECISION_AGENT:
      "Evaluated conditional expression. Branch 'true' selected based on input data.",
    VERIFICATION_AGENT:
      "Ran 3 validation checks against input data. All checks passed.",
    COMPLIANCE_AGENT:
      "Verified document against 12 compliance rules. No violations detected.",
  };

  return (
    summaries[node.nodeType] ||
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

  // In production, you'd also handle req.on('error') and req.on('end')
});

export const executionRouter = router;
