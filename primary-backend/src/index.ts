import express from "express";
import cors from "cors";
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

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "agentflow-backend",
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

app.listen(PORT, () => {
  console.log(`🚀 AgentFlow AI Backend running on port ${PORT}`);
});
