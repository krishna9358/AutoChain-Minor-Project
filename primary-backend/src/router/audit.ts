import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";

const router = Router();

// List audit logs
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { workflowId, action, limit } = req.query;

    const where: any = {};
    if (workflowId) where.workflowId = workflowId;
    if (action) where.action = { contains: action as string };

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string) || 100,
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get audit trail for specific workflow
router.get("/workflow/:workflowId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { workflowId: req.params.workflowId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const auditRouter = router;
