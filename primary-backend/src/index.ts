import express from "express";
import cors from "cors";
import prisma from "./db";
import { DEV_USER_ID } from "./middleware";
import { userRouter } from "./router/user";
import { workflowRouter } from "./router/workflow";
import { workspaceRouter } from "./router/workspace";
import { executionRouter } from "./router/execution";
import { templateRouter } from "./router/template";
import { approvalRouter } from "./router/approval";
import { toolRouter } from "./router/tool";
import { auditRouter } from "./router/audit";
import { generateRouter } from "./router/generate";
import { componentCatalogRouter } from "./router/componentCatalog";
import { secretsRouter } from "./router/secrets";
import { apiKeysRouter } from "./router/apiKeys";

const app = express();
const PORT = process.env.PORT || 3001;

async function ensureDevUser() {
  if (process.env.NODE_ENV === "production") return;
  try {
    let user = await prisma.user.findUnique({ where: { id: DEV_USER_ID } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: DEV_USER_ID,
          email: "dev@autochain.ai",
          name: "Dev User",
          password: "dev123",
          role: "ADMIN",
        },
      });
      console.log("Dev user bootstrapped:", DEV_USER_ID);
    }

    const hasMembership = await prisma.workspaceMember.findFirst({
      where: { userId: DEV_USER_ID },
    });
    if (!hasMembership) {
      const ws = await prisma.workspace.create({
        data: {
          name: "Personal",
          slug: "personal",
          description: "My personal workspace",
          members: { create: { userId: DEV_USER_ID, role: "ADMIN" } },
        },
      });
      console.log("Default workspace created:", ws.id);
    }
  } catch (err) {
    console.warn("Dev bootstrap skipped (may already exist):", (err as Error).message);
  }
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "autochain-backend",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/workflows", workflowRouter);
app.use("/api/v1/workspaces", workspaceRouter);
app.use("/api/v1/execution", executionRouter);
app.use("/api/v1/templates", templateRouter);
app.use("/api/v1/approvals", approvalRouter);
app.use("/api/v1/tools", toolRouter);
app.use("/api/v1/audit", auditRouter);
app.use("/api/v1/generate", generateRouter);
app.use("/api/v1/components", componentCatalogRouter);
app.use("/api/v1/secrets", secretsRouter);
app.use("/api/v1/api-keys", apiKeysRouter);

ensureDevUser().then(() => {
  app.listen(PORT, () => {
    console.log(`AutoChain AI Backend running on port ${PORT}`);
  });
});
