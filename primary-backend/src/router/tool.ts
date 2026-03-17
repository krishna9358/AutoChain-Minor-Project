import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";

const router = Router();

// List tools
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId },
    });

    if (!membership) {
      return res.json([]);
    }

    const tools = await prisma.tool.findMany({
      where: {
        OR: [
          { workspaceId: membership.workspaceId },
          { isBuiltIn: true },
        ],
      },
      orderBy: { name: "asc" },
    });

    res.json(tools);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create tool
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, icon, category, inputSchema, executionConfig, authConfig } = req.body;

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId },
    });

    if (!membership) {
      return res.status(400).json({ error: "No workspace" });
    }

    const tool = await prisma.tool.create({
      data: {
        workspaceId: membership.workspaceId,
        name,
        description,
        icon,
        category,
        inputSchema: inputSchema || {},
        executionConfig: executionConfig || {},
        authConfig,
      },
    });

    res.json(tool);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update tool
router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tool = await prisma.tool.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(tool);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete tool
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.tool.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const toolRouter = router;
