import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import { encrypt, decryptStoredSecretValue } from "../services/secretCrypto";

const router = Router();

// List secrets for workspace
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { workspaceId } = req.query;

    // Find user's workspace if not provided
    let wsId = workspaceId as string | undefined;
    if (!wsId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.userId },
      });
      wsId = membership?.workspaceId;
    }

    if (!wsId) {
      return res.status(400).json({ error: "No workspace found" });
    }

    const secrets = await prisma.secret.findMany({
      where: { workspaceId: wsId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Return secrets without exposing the decrypted values
    const safeSecrets = secrets.map((s: any) => ({
      id: s.id,
      name: s.name,
      key: s.key,
      type: s.type,
      description: s.description,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
      createdBy: s.creator,
      // Only return a masked value (first 4 chars + asterisks)
      valuePreview: s.value ? `${s.value.substring(0, 4)}${"*".repeat(Math.max(8, s.value.length - 4))}` : null,
    }));

    res.json(safeSecrets);
  } catch (err: any) {
    console.error("List secrets error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific secret (with decrypted value)
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const secret = await prisma.secret.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!secret) {
      return res.status(404).json({ error: "Secret not found" });
    }

    // Verify workspace access
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: secret.workspaceId },
    });

    if (!membership) {
      return res.status(403).json({ error: "Access denied" });
    }

    const decryptedValue = decryptStoredSecretValue(secret.value);

    // Update lastUsedAt
    await prisma.secret.update({
      where: { id: req.params.id },
      data: { lastUsedAt: new Date() },
    });

    res.json({
      ...secret,
      value: decryptedValue,
      valuePreview: decryptedValue
        ? `${decryptedValue.substring(0, 4)}${"*".repeat(Math.max(8, decryptedValue.length - 4))}`
        : null,
    });
  } catch (err: any) {
    console.error("Get secret error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new secret
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, key, value, type, description, workspaceId, expiresAt } = req.body;

    // Validate required fields
    if (!name || !key || !value) {
      return res.status(400).json({ error: "name, key, and value are required" });
    }

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

    // Check if key already exists in workspace
    const existing = await prisma.secret.findFirst({
      where: { workspaceId: wsId, key },
    });

    if (existing) {
      return res.status(409).json({ error: "Secret key already exists in workspace" });
    }

    // Encrypt the value
    const encrypted = encrypt(value);

    const secret = await prisma.secret.create({
      data: {
        workspaceId: wsId,
        name,
        key,
        value: JSON.stringify(encrypted),
        type: type || "OTHER",
        description,
        createdBy: req.userId!,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: "secret.created",
        details: { secretId: secret.id, name: secret.name },
      },
    });

    res.json({
      ...secret,
      valuePreview: value ? `${value.substring(0, 4)}${"*".repeat(Math.max(8, value.length - 4))}` : null,
    });
  } catch (err: any) {
    console.error("Create secret error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update a secret
router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, value, type, description, expiresAt } = req.body;

    const secret = await prisma.secret.findUnique({
      where: { id: req.params.id },
    });

    if (!secret) {
      return res.status(404).json({ error: "Secret not found" });
    }

    // Verify workspace access
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: secret.workspaceId },
    });

    if (!membership || membership.role === "VIEWER") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (value !== undefined) {
      const enc = encrypt(value);
      updateData.value = JSON.stringify(enc);
    }
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const updated = await prisma.secret.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: "secret.updated",
        details: { secretId: secret.id, name: updated.name },
      },
    });

    res.json({
      ...updated,
      valuePreview: value ? `${value.substring(0, 4)}${"*".repeat(Math.max(8, value.length - 4))}` : null,
    });
  } catch (err: any) {
    console.error("Update secret error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a secret
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const secret = await prisma.secret.findUnique({
      where: { id: req.params.id },
    });

    if (!secret) {
      return res.status(404).json({ error: "Secret not found" });
    }

    // Verify workspace access and permissions
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: secret.workspaceId },
    });

    if (!membership || membership.role === "VIEWER") {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.secret.delete({
      where: { id: req.params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: "secret.deleted",
        details: { secretId: secret.id, name: secret.name },
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete secret error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reveal a secret's value (for UI purposes)
router.post("/:id/reveal", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const secret = await prisma.secret.findUnique({
      where: { id: req.params.id },
    });

    if (!secret) {
      return res.status(404).json({ error: "Secret not found" });
    }

    // Verify workspace access
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId, workspaceId: secret.workspaceId },
    });

    if (!membership) {
      return res.status(403).json({ error: "Access denied" });
    }

    const decryptedValue = decryptStoredSecretValue(secret.value);

    // Update lastUsedAt
    await prisma.secret.update({
      where: { id: req.params.id },
      data: { lastUsedAt: new Date() },
    });

    res.json({ value: decryptedValue });
  } catch (err: any) {
    console.error("Reveal secret error:", err);
    res.status(500).json({ error: err.message });
  }
});

export const secretsRouter = router;
