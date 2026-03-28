import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import { encrypt, decrypt } from "../services/secretCrypto";

const router = Router();

/** List all GitHub connections for a workspace (no secrets). */
router.get("/connections", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "").trim();
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId query parameter is required" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    const connections = await prisma.connection.findMany({
      where: { workspaceId, provider: "github" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        metadata: true,
        createdAt: true,
      },
    });

    res.json(connections);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** Create a new GitHub PAT connection for a workspace. */
router.post("/connections", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workspaceId = String(req.body?.workspaceId || "").trim();
    const name = String(req.body?.name || "").trim();
    const personalAccessToken = String(req.body?.personalAccessToken || "").trim();

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!personalAccessToken) {
      return res.status(400).json({ error: "personalAccessToken is required" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    const enc = encrypt(personalAccessToken);
    const connection = await prisma.connection.create({
      data: {
        workspaceId,
        provider: "github",
        name,
        status: "active",
        credentials: JSON.stringify(enc),
      },
    });

    res.json({
      id: connection.id,
      name: connection.name,
      status: connection.status,
      metadata: connection.metadata,
      createdAt: connection.createdAt,
    });
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "A GitHub connection with this name already exists in the workspace" });
    }
    console.error("[github-integration] create connection:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Test a GitHub connection by calling the GitHub API. */
router.post("/connections/:id/test", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: req.params.id },
    });
    if (!connection || connection.provider !== "github") {
      return res.status(404).json({ error: "Connection not found" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId: connection.workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    const { encrypted, iv, authTag } = JSON.parse(connection.credentials as string);
    const token = decrypt(encrypted, iv, authTag);

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ZapierClone-Backend",
      },
    });

    if (!response.ok) {
      return res.status(400).json({
        error: "GitHub authentication failed",
        status: response.status,
      });
    }

    const ghUser = await response.json();

    await prisma.connection.update({
      where: { id: connection.id },
      data: { lastUsedAt: new Date(), status: "active" },
    });

    res.json({
      success: true,
      username: ghUser.login,
    });
  } catch (e: any) {
    console.error("[github-integration] test connection:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Delete a GitHub connection. */
router.delete("/connections/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: req.params.id },
    });
    if (!connection || connection.provider !== "github") {
      return res.status(404).json({ error: "Connection not found" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId: connection.workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    await prisma.connection.delete({ where: { id: connection.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export const githubIntegrationRouter = router;
