import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";

const router = Router();

// List templates
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;

    const where: any = { isPublic: true };
    if (category) where.category = category as string;

    const templates = await prisma.template.findMany({
      where,
      orderBy: { usageCount: "desc" },
    });

    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single template
router.get("/:id", async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Increment usage
    await prisma.template.update({
      where: { id: req.params.id },
      data: { usageCount: { increment: 1 } },
    });

    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create template from workflow
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, category, icon, tags, nodesData, edgesData, isPublic } = req.body;

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId },
    });

    const template = await prisma.template.create({
      data: {
        workspaceId: membership?.workspaceId,
        name,
        description,
        category,
        icon,
        tags: tags || [],
        nodesData: nodesData || [],
        edgesData: edgesData || [],
        isPublic: isPublic !== false,
      },
    });

    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.template.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const templateRouter = router;
