import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";

const router = Router();

/**
 * List artifacts (newest first).
 * - With `?workspaceId=` and user is a member → only that workspace.
 * - Otherwise → all workspaces the user belongs to (avoids empty UI when
 *   active workspace in the client doesn’t match the workflow’s workspace).
 */
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const memberRows = await prisma.workspaceMember.findMany({
      where: { userId: req.userId },
      select: { workspaceId: true },
    });
    const memberWorkspaceIds = memberRows.map((m) => m.workspaceId);
    if (memberWorkspaceIds.length === 0) {
      return res.status(400).json({ error: "No workspace found" });
    }

    const requested =
      typeof req.query.workspaceId === "string" ? req.query.workspaceId.trim() : "";
    const scopeWorkspaceIds =
      requested && memberWorkspaceIds.includes(requested)
        ? [requested]
        : memberWorkspaceIds;

    const artifacts = await prisma.artifact.findMany({
      where: { workspaceId: { in: scopeWorkspaceIds } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        workspace: { select: { id: true, name: true } },
      },
    });

    res.json(artifacts);
  } catch (err: any) {
    console.error("List artifacts error:", err);
    res.status(500).json({ error: err.message });
  }
});

/** Get one artifact */
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const art = await prisma.artifact.findUnique({
      where: { id: req.params.id },
    });
    if (!art) {
      return res.status(404).json({ error: "Artifact not found" });
    }
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: art.workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(art);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Delete artifact */
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const art = await prisma.artifact.findUnique({
      where: { id: req.params.id },
    });
    if (!art) {
      return res.status(404).json({ error: "Artifact not found" });
    }
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: art.workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Access denied" });
    }
    await prisma.artifact.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const artifactsRouter = router;
