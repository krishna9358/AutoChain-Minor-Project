import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { validateWorkflowNodes } from "./componentCatalog";

const router = Router();

// Create workflow
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, workspaceId, nodes, edges } = req.body;

    // Get user's workspace if not provided
    let wsId = workspaceId;
    if (!wsId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId },
      });
      wsId = membership?.workspaceId;
    }

    if (!wsId) {
      return res.status(400).json({ error: "No workspace found" });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: wsId },
    });
    if (!membership || membership.role === "VIEWER") {
      return res.status(403).json({ error: "Access denied" });
    }

    const inputNodes = Array.isArray(nodes) ? nodes : [];
    const nodeValidation = validateWorkflowNodes(inputNodes);

    if (!nodeValidation.ok) {
      return res.status(422).json({
        error: "Invalid workflow node configuration",
        details: nodeValidation.errors,
      });
    }

    const normalizedNodes = nodeValidation.normalized;

    const workflow = await prisma.workflow.create({
      data: {
        name: name || "Untitled Workflow",
        description,
        workspaceId: wsId,
        userId: req.userId!,
        nodes: normalizedNodes.length
          ? {
              create: normalizedNodes.map((n: any, i: number) => ({
                id: inputNodes[i]?.id || n.id,
                nodeType: n.componentId as any,
                category: inputNodes[i]?.category,
                label: inputNodes[i]?.label,
                description: inputNodes[i]?.description,
                config: (n.config || {}) as Prisma.InputJsonValue,
                position: inputNodes[i]?.position || { x: 0, y: 0 },
                metadata: {
                  ...(inputNodes[i]?.metadata || {}),
                  componentId: n.componentId,
                },
                retryConfig: inputNodes[i]?.retryConfig,
              })),
            }
          : undefined,
      },
      include: {
        nodes: true,
        edges: true,
      },
    });

    // Create edges if provided
    if (edges && edges.length > 0 && workflow.nodes.length > 0) {
      // Map temp IDs to real IDs
      const nodeMap = new Map<string, string>();
      if (inputNodes.length) {
        inputNodes.forEach((n: any, i: number) => {
          nodeMap.set(n.tempId || n.id || `node-${i}`, workflow.nodes[i].id);
        });
      }

      for (const edge of edges) {
        const sourceId = nodeMap.get(edge.source) || edge.source;
        const targetId = nodeMap.get(edge.target) || edge.target;

        await prisma.workflowEdge.create({
          data: {
            workflowId: workflow.id,
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            label: edge.label,
            condition: edge.condition,
          },
        });
      }
    }

    // Create initial version
    await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: 1,
        nodesData: (normalizedNodes || []) as unknown as Prisma.InputJsonValue,
        edgesData: edges || [],
        changelog: "Initial version",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        workflowId: workflow.id,
        userId: req.userId!,
        action: "workflow.created",
        details: { name: workflow.name },
      },
    });

    const fullWorkflow = await prisma.workflow.findUnique({
      where: { id: workflow.id },
      include: { nodes: true, edges: true, versions: true },
    });

    res.json(fullWorkflow);
  } catch (err: any) {
    console.error("Create workflow error:", err);
    res.status(500).json({ error: err.message });
  }
});

// List workflows
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const requestedWorkspaceId =
      typeof req.query.workspaceId === "string"
        ? req.query.workspaceId.trim()
        : "";
    const membership = await prisma.workspaceMember.findFirst({
      where: requestedWorkspaceId
        ? { userId: req.userId, workspaceId: requestedWorkspaceId }
        : { userId: req.userId },
      orderBy: { joinedAt: "asc" },
    });

    if (!membership) {
      return res.json([]);
    }

    const workflows = await prisma.workflow.findMany({
      where: { workspaceId: membership.workspaceId },
      include: {
        nodes: true,
        edges: true,
        runs: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { runs: true, versions: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(workflows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single workflow
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id },
      include: {
        nodes: true,
        edges: true,
        versions: {
          orderBy: { version: "desc" },
        },
        runs: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            steps: true,
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: workflow.workspaceId },
    });
    if (!membership) {
      return res.status(403).json({ error: "Access denied" });
    }

    const requestedWorkspaceId =
      typeof req.query.workspaceId === "string"
        ? req.query.workspaceId.trim()
        : "";
    if (requestedWorkspaceId && requestedWorkspaceId !== workflow.workspaceId) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json(workflow);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update workflow
router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, status, nodes, edges } = req.body;

    const existing = await prisma.workflow.findUnique({
      where: { id: req.params.id },
      select: { id: true, workspaceId: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: existing.workspaceId },
    });
    if (!membership || membership.role === "VIEWER") {
      return res.status(403).json({ error: "Access denied" });
    }

    const workflow = await prisma.workflow.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        status,
        updatedAt: new Date(),
      },
    });

    // Update nodes if provided
    if (nodes) {
      const inputNodes = Array.isArray(nodes) ? nodes : [];
      const nodeValidation = validateWorkflowNodes(inputNodes);

      if (!nodeValidation.ok) {
        return res.status(422).json({
          error: "Invalid workflow node configuration",
          details: nodeValidation.errors,
        });
      }

      const normalizedNodes = nodeValidation.normalized;

      // Delete existing nodes (cascade deletes edges; RunSteps are preserved
      // with nodeId set to null via onDelete: SetNull)
      await prisma.workflowNode.deleteMany({
        where: { workflowId: workflow.id },
      });

      // Recreate nodes
      for (let i = 0; i < normalizedNodes.length; i += 1) {
        const n = normalizedNodes[i];
        const originalNode = inputNodes[i] || {};

        await prisma.workflowNode.create({
          data: {
            id: originalNode.id || n.id,
            workflowId: workflow.id,
            nodeType: n.componentId as any,
            category: originalNode.category,
            label: originalNode.label,
            description: originalNode.description,
            config: (n.config || {}) as Prisma.InputJsonValue,
            position: originalNode.position || { x: 0, y: 0 },
            metadata: {
              ...(originalNode.metadata || {}),
              componentId: n.componentId,
            },
            retryConfig: originalNode.retryConfig,
          },
        });
      }

      // Recreate edges
      if (edges) {
        for (const e of edges) {
          await prisma.workflowEdge.create({
            data: {
              workflowId: workflow.id,
              sourceNodeId: e.source || e.sourceNodeId,
              targetNodeId: e.target || e.targetNodeId,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
              label: e.label,
              condition: e.condition,
            },
          });
        }
      }

      // Create new version
      const latestVersion = await prisma.workflowVersion.findFirst({
        where: { workflowId: workflow.id },
        orderBy: { version: "desc" },
      });

      const newVersion = (latestVersion?.version || 0) + 1;

      await prisma.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          version: newVersion,
          nodesData: normalizedNodes as unknown as Prisma.InputJsonValue,
          edgesData: edges || [],
          changelog: `Version ${newVersion}`,
        },
      });

      await prisma.workflow.update({
        where: { id: workflow.id },
        data: { currentVersion: newVersion },
      });
    }

    // Audit
    await prisma.auditLog.create({
      data: {
        workflowId: workflow.id,
        userId: req.userId!,
        action: "workflow.updated",
        details: { name: workflow.name },
      },
    });

    const updated = await prisma.workflow.findUnique({
      where: { id: workflow.id },
      include: { nodes: true, edges: true, versions: true },
    });

    res.json(updated);
  } catch (err: any) {
    console.error("Update workflow error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete workflow (and dependent runs / approvals / audit rows — FK-safe)
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: { id: true, workspaceId: true },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: workflow.workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.$transaction(async (tx) => {
      const runs = await tx.workflowRun.findMany({
        where: { workflowId: id },
        select: { id: true },
      });
      const runIds = runs.map((r) => r.id);

      if (runIds.length > 0) {
        await tx.approval.deleteMany({ where: { runId: { in: runIds } } });
      }

      await tx.workflowRun.deleteMany({ where: { workflowId: id } });
      await tx.auditLog.deleteMany({ where: { workflowId: id } });
      await tx.workflow.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete workflow error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get workflow versions
router.get("/:id/versions", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const versions = await prisma.workflowVersion.findMany({
      where: { workflowId: req.params.id },
      orderBy: { version: "desc" },
    });

    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rollback to version
router.post(
  "/:id/rollback/:version",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const version = await prisma.workflowVersion.findUnique({
        where: {
          workflowId_version: {
            workflowId: req.params.id,
            version: parseInt(req.params.version),
          },
        },
      });

      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }

      // Restore nodes and edges from version snapshot
      await prisma.workflowNode.deleteMany({
        where: { workflowId: req.params.id },
      });

      const nodesData = version.nodesData as any[];
      if (Array.isArray(nodesData)) {
        for (const n of nodesData) {
          await prisma.workflowNode.create({
            data: {
              id: n.id,
              workflowId: req.params.id,
              nodeType: n.componentId || n.nodeType,
              category: n.category || "",
              label: n.label || "",
              description: n.description,
              config: (n.config || {}) as Prisma.InputJsonValue,
              position: n.position || { x: 0, y: 0 },
              metadata: n.metadata || {},
              retryConfig: n.retryConfig,
            },
          });
        }
      }

      const edgesData = version.edgesData as any[];
      if (Array.isArray(edgesData)) {
        for (const e of edgesData) {
          await prisma.workflowEdge.create({
            data: {
              workflowId: req.params.id,
              sourceNodeId: e.source || e.sourceNodeId,
              targetNodeId: e.target || e.targetNodeId,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
              label: e.label,
              condition: e.condition,
            },
          });
        }
      }

      await prisma.workflow.update({
        where: { id: req.params.id },
        data: { currentVersion: version.version },
      });

      const restored = await prisma.workflow.findUnique({
        where: { id: req.params.id },
        include: { nodes: true, edges: true, versions: true },
      });

      res.json({
        success: true,
        version: version.version,
        workflow: restored,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

export const workflowRouter = router;
