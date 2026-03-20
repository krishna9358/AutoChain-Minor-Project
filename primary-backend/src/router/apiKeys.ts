import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import crypto from "crypto";
import { hashRawApiKey } from "../services/apiKeyService";

const router = Router();

// Generate a new API key (hash must match apiKeyService.hashRawApiKey)
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `ak_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = key.substring(0, 12);
  const hash = hashRawApiKey(key);
  return { key, hash, prefix };
}

// List API keys
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { workspaceId, includeRevoked } = req.query;

    // Find user's workspace if not provided
    let wsId = workspaceId as string | undefined;
    if (!wsId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId },
      });
      wsId = membership?.workspaceId;
    }

    const where: any = { userId: req.userId };
    if (wsId) {
      where.workspaceId = wsId;
    }
    if (!includeRevoked) {
      where.isRevoked = false;
    }

    const apiKeys = await prisma.apiKey.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        workspace: wsId ? { select: { id: true, name: true } } : undefined,
      },
      orderBy: { createdAt: "desc" },
    });

    // Return API keys without exposing the full key
    const safeApiKeys = apiKeys.map((k: any) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      scopes: k.scopes,
      workspaceId: k.workspaceId,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      isRevoked: k.isRevoked,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
      user: k.user,
      workspace: k.workspace,
    }));

    res.json(safeApiKeys);
  } catch (err: any) {
    console.error("List API keys error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific API key
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        workspace: { select: { id: true, name: true } },
      },
    });

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }

    // Verify ownership
    if (apiKey.userId !== req.userId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId, workspaceId: apiKey.workspaceId || "" },
      });

      if (!membership || membership.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    res.json({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      scopes: apiKey.scopes,
      workspaceId: apiKey.workspaceId,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      isRevoked: apiKey.isRevoked,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      user: apiKey.user,
      workspace: apiKey.workspace,
    });
  } catch (err: any) {
    console.error("Get API key error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new API key
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, workspaceId, scopes, expiresInDays } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // Validate scopes
    const validScopes = ["READ", "WRITE", "EXECUTE", "ADMIN"];
    const keyScopes: string[] = scopes && Array.isArray(scopes)
      ? scopes.filter((s: string) => validScopes.includes(s))
      : ["READ"];

    if (keyScopes.length === 0) {
      return res.status(400).json({ error: "At least one valid scope is required" });
    }

    // Get user's workspace if not provided
    let wsId: string | null = workspaceId;
    if (!wsId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId },
      });
      wsId = membership?.workspaceId || null;
    }

    // If workspace-specific, verify access
    if (wsId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId, workspaceId: wsId },
      });

      if (!membership) {
        return res.status(403).json({ error: "Access denied to workspace" });
      }
    }

    // Generate API key
    const { key, hash, prefix } = generateApiKey();

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (expiresInDays) {
      const days = parseInt(expiresInDays, 10);
      if (days > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }
    }

    // Create API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.userId!,
        workspaceId: wsId,
        name,
        keyHash: hash,
        prefix,
        scopes: keyScopes as any,
        expiresAt,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: "api-key.created",
        details: { apiKeyId: apiKey.id, name: apiKey.name },
      },
    });

    // Return the full key only once (upon creation)
    res.json({
      id: apiKey.id,
      name: apiKey.name,
      key, // Only show full key on creation
      prefix: apiKey.prefix,
      scopes: apiKey.scopes,
      workspaceId: apiKey.workspaceId,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      user: apiKey.user,
    });
  } catch (err: any) {
    console.error("Create API key error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update an API key
router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, scopes, expiresAt } = req.body;

    const apiKey = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }

    // Verify ownership
    if (apiKey.userId !== req.userId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId, workspaceId: apiKey.workspaceId || "" },
      });

      if (!membership || membership.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (scopes !== undefined) {
      const validScopes = ["READ", "WRITE", "EXECUTE", "ADMIN"];
      const keyScopes: string[] = Array.isArray(scopes)
        ? scopes.filter((s: string) => validScopes.includes(s))
        : ["READ"];

      if (keyScopes.length === 0) {
        return res.status(400).json({ error: "At least one valid scope is required" });
      }
      updateData.scopes = keyScopes;
    }
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const updated = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: "api-key.updated",
        details: { apiKeyId: apiKey.id, name: updated.name },
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      prefix: updated.prefix,
      scopes: updated.scopes,
      workspaceId: updated.workspaceId,
      lastUsedAt: updated.lastUsedAt,
      expiresAt: updated.expiresAt,
      isRevoked: updated.isRevoked,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      user: updated.user,
    });
  } catch (err: any) {
    console.error("Update API key error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete an API key
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }

    // Verify ownership
    if (apiKey.userId !== req.userId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId, workspaceId: apiKey.workspaceId || "" },
      });

      if (!membership || membership.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    await prisma.apiKey.delete({
      where: { id: req.params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: "api-key.deleted",
        details: { apiKeyId: apiKey.id, name: apiKey.name },
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete API key error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Revoke an API key (soft delete)
router.post("/:id/revoke", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }

    // Verify ownership
    if (apiKey.userId !== req.userId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId, workspaceId: apiKey.workspaceId || "" },
      });

      if (!membership || membership.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const revoked = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { isRevoked: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: "api-key.revoked",
        details: { apiKeyId: apiKey.id, name: apiKey.name },
      },
    });

    res.json({
      id: revoked.id,
      name: revoked.name,
      prefix: revoked.prefix,
      scopes: revoked.scopes,
      isRevoked: revoked.isRevoked,
      revokedAt: revoked.updatedAt,
    });
  } catch (err: any) {
    console.error("Revoke API key error:", err);
    res.status(500).json({ error: err.message });
  }
});

export const apiKeysRouter = router;
