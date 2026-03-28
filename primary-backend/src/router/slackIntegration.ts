import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import { encrypt, decrypt } from "../services/secretCrypto";

const router = Router();

/** List all Slack connections for a workspace (no credentials). */
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
      where: { workspaceId, provider: "slack" },
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

/** Create a new Slack connection. */
router.post("/connections", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { workspaceId, name, mode, webhookUrl, botToken } = req.body || {};

    if (!workspaceId || !name || !mode) {
      return res.status(400).json({ error: "workspaceId, name, and mode are required" });
    }

    if (mode !== "webhook" && mode !== "bot") {
      return res.status(400).json({ error: "mode must be 'webhook' or 'bot'" });
    }

    if (mode === "webhook" && !webhookUrl) {
      return res.status(400).json({ error: "webhookUrl is required for webhook mode" });
    }

    if (mode === "bot" && !botToken) {
      return res.status(400).json({ error: "botToken is required for bot mode" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    const secret = mode === "webhook" ? webhookUrl : botToken;
    const enc = encrypt(secret);
    const credentialsJson = JSON.stringify(enc);

    const connection = await prisma.connection.create({
      data: {
        workspaceId,
        provider: "slack",
        name,
        status: "active",
        credentials: credentialsJson,
        metadata: { mode },
      },
      select: {
        id: true,
        name: true,
        status: true,
        metadata: true,
        createdAt: true,
      },
    });

    res.json(connection);
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(409).json({
        error: "A Slack connection with this name already exists in the workspace",
      });
    }
    console.error("[slack-integration] create:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Test a Slack connection by sending a test message or verifying auth. */
router.post("/connections/:id/test", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: req.params.id },
    });
    if (!connection || connection.provider !== "slack") {
      return res.status(404).json({ error: "Slack connection not found" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId: connection.workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    const { encrypted, iv, authTag } = JSON.parse(connection.credentials);
    const secret = decrypt(encrypted, iv, authTag);
    const metadata = connection.metadata as { mode?: string } | null;
    const mode = metadata?.mode;

    if (mode === "webhook") {
      const response = await fetch(secret, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "✅ Test message from your workflow platform." }),
      });

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          error: `Webhook returned status ${response.status}`,
        });
      }

      await prisma.connection.update({
        where: { id: connection.id },
        data: { lastUsedAt: new Date() },
      });

      return res.json({ success: true, message: "Webhook test message sent successfully" });
    }

    if (mode === "bot") {
      const response = await fetch("https://slack.com/api/auth.test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!data.ok) {
        return res.status(400).json({
          success: false,
          error: data.error || "Slack auth.test failed",
        });
      }

      await prisma.connection.update({
        where: { id: connection.id },
        data: { lastUsedAt: new Date() },
      });

      return res.json({
        success: true,
        message: "Bot token is valid",
        team: data.team,
        user: data.user,
      });
    }

    return res.status(400).json({ error: "Unknown connection mode" });
  } catch (e: any) {
    console.error("[slack-integration] test:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Delete a Slack connection. */
router.delete("/connections/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: req.params.id },
    });
    if (!connection || connection.provider !== "slack") {
      return res.status(404).json({ error: "Slack connection not found" });
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

export const slackIntegrationRouter = router;
