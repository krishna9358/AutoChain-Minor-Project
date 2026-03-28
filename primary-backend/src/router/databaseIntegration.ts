import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import { encrypt, decrypt } from "../services/secretCrypto";

const router = Router();

/** List all database connections for a workspace (no secrets). */
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
      where: { workspaceId, provider: "database" },
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

/** Create a new database connection for a workspace. */
router.post("/connections", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workspaceId = String(req.body?.workspaceId || "").trim();
    const name = String(req.body?.name || "").trim();
    const dbType = String(req.body?.dbType || "").trim();
    const connectionString = String(req.body?.connectionString || "").trim();

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!dbType) {
      return res.status(400).json({ error: "dbType is required" });
    }
    if (!connectionString) {
      return res.status(400).json({ error: "connectionString is required" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    const enc = encrypt(connectionString);
    const connection = await prisma.connection.create({
      data: {
        workspaceId,
        provider: "database",
        name,
        status: "active",
        credentials: JSON.stringify(enc),
        metadata: { dbType },
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
      return res.status(409).json({ error: "A database connection with this name already exists in the workspace" });
    }
    console.error("[database-integration] create connection:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Test a database connection. */
router.post("/connections/:id/test", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: req.params.id },
    });
    if (!connection || connection.provider !== "database") {
      return res.status(404).json({ error: "Connection not found" });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.userId!, workspaceId: connection.workspaceId },
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    const { encrypted, iv, authTag } = JSON.parse(connection.credentials as string);
    const connStr = decrypt(encrypted, iv, authTag);
    const meta = (connection.metadata as { dbType?: string }) || {};
    const dbType = meta.dbType || "PostgreSQL";

    // Validate connection string format based on database type
    let valid = false;
    let message = "";

    if (dbType === "PostgreSQL") {
      const pgPattern = /^postgres(ql)?:\/\/.+/i;
      if (pgPattern.test(connStr)) {
        // Attempt a TCP connection to validate host/port
        try {
          const url = new URL(connStr);
          const host = url.hostname;
          const port = parseInt(url.port || "5432", 10);
          await tcpCheck(host, port, 5000);
          valid = true;
          message = `PostgreSQL connection test passed. Host ${host}:${port} is reachable.`;
        } catch (tcpErr: any) {
          return res.status(400).json({
            error: `PostgreSQL host unreachable: ${tcpErr.message}`,
          });
        }
      } else {
        return res.status(400).json({ error: "Invalid PostgreSQL connection string format. Expected: postgresql://..." });
      }
    } else if (dbType === "MySQL") {
      const mysqlPattern = /^mysql:\/\/.+/i;
      if (mysqlPattern.test(connStr)) {
        try {
          const url = new URL(connStr);
          const host = url.hostname;
          const port = parseInt(url.port || "3306", 10);
          await tcpCheck(host, port, 5000);
          valid = true;
          message = `MySQL connection test passed. Host ${host}:${port} is reachable.`;
        } catch (tcpErr: any) {
          return res.status(400).json({
            error: `MySQL host unreachable: ${tcpErr.message}`,
          });
        }
      } else {
        return res.status(400).json({ error: "Invalid MySQL connection string format. Expected: mysql://..." });
      }
    } else if (dbType === "MongoDB") {
      const mongoPattern = /^mongodb(\+srv)?:\/\/.+/i;
      if (mongoPattern.test(connStr)) {
        // For MongoDB+SRV we skip TCP check as DNS resolution differs
        if (connStr.startsWith("mongodb+srv://")) {
          valid = true;
          message = "MongoDB connection string format is valid (SRV record — skipping TCP check).";
        } else {
          try {
            const url = new URL(connStr);
            const host = url.hostname;
            const port = parseInt(url.port || "27017", 10);
            await tcpCheck(host, port, 5000);
            valid = true;
            message = `MongoDB connection test passed. Host ${host}:${port} is reachable.`;
          } catch (tcpErr: any) {
            return res.status(400).json({
              error: `MongoDB host unreachable: ${tcpErr.message}`,
            });
          }
        }
      } else {
        return res.status(400).json({ error: "Invalid MongoDB connection string format. Expected: mongodb://... or mongodb+srv://..." });
      }
    } else {
      return res.status(400).json({ error: `Unsupported database type: ${dbType}` });
    }

    if (valid) {
      await prisma.connection.update({
        where: { id: connection.id },
        data: { lastUsedAt: new Date(), status: "active" },
      });
    }

    res.json({ success: valid, message });
  } catch (e: any) {
    console.error("[database-integration] test connection:", e);
    res.status(500).json({ error: e.message });
  }
});

/** Delete a database connection. */
router.delete("/connections/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: req.params.id },
    });
    if (!connection || connection.provider !== "database") {
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

/** Simple TCP connectivity check using Node's net module. */
function tcpCheck(host: string, port: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Dynamic import to keep module-level imports clean
    const net = require("net");
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Connection timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    socket.on("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve();
    });
    socket.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export const databaseIntegrationRouter = router;
