import { Router } from "express";
import prisma from "../db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authMiddleware, AuthRequest, generateToken, JWT_SECRET, DEV_USER_ID } from "../middleware";
import { z } from "zod";

const router = Router();

// Dev mode bootstrap — idempotently creates dev user + Personal workspace
router.get("/dev-bootstrap", async (req, res) => {
  try {
    let user = await prisma.user.findUnique({ where: { id: DEV_USER_ID } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: DEV_USER_ID,
          email: "dev@autochain.ai",
          name: "Dev User",
          password: await bcrypt.hash("dev123", 10),
          role: "ADMIN",
        },
      });
    }

    // Always ensure user has a Personal workspace (idempotent)
    const existingMembership = await prisma.workspaceMember.findFirst({
      where: { userId: DEV_USER_ID },
    });

    if (!existingMembership) {
      await prisma.workspace.create({
        data: {
          name: "Personal",
          slug: "personal",
          description: "My personal workspace",
          members: {
            create: { userId: user.id, role: "ADMIN" },
          },
        },
      });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: DEV_USER_ID },
      include: { workspace: true },
    });

    const workspaceId = membership?.workspace?.id;

    // Seed demo workflow if it doesn't already exist
    if (workspaceId) {
      const demoExists = await prisma.workflow.findFirst({
        where: { workspaceId, name: "Support Ticket Triage AI" },
      });

      if (!demoExists) {
        await seedDemoWorkflow(workspaceId);
      }
    }

    res.json({
      token: "dev-demo-token",
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      workspace: membership?.workspace || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Demo workflow seeder ─────────────────────────────────────────
async function seedDemoWorkflow(workspaceId: string) {
  // Node IDs (stable so the workflow can be re-seeded cleanly)
  const n1 = "demo-node-trigger";
  const n2 = "demo-node-extract";
  const n3 = "demo-node-classify";
  const n4 = "demo-node-reason";
  const n5 = "demo-node-email";

  const workflow = await prisma.workflow.create({
    data: {
      workspaceId,
      userId: DEV_USER_ID,
      name: "Support Ticket Triage AI",
      description:
        "Automatically triage inbound support tickets: extract details, classify issue type, generate a reply draft, and send it to the customer.",
      status: "ACTIVE",
      nodes: {
        create: [
          {
            id: n1,
            nodeType: "WEBHOOK_TRIGGER",
            category: "TRIGGER",
            label: "New Support Ticket",
            description: "Fires when a ticket arrives via webhook",
            position: { x: 300, y: 60 },
            config: {
              triggerMode: "webhook",
              webhookPath: "/incoming/support",
              inputSchema: {
                type: "object",
                properties: {
                  ticketId: { type: "string" },
                  customerEmail: { type: "string" },
                  subject: { type: "string" },
                  body: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                },
              },
            },
            metadata: { componentId: "entry-point", isDemo: true },
          },
          {
            id: n2,
            nodeType: "EXTRACTION_AGENT",
            category: "AI_AGENT",
            label: "Extract Ticket Info",
            description: "Pull out customer name, issue summary, and affected product",
            position: { x: 300, y: 220 },
            config: {
              extractionFields: [
                { name: "customerName", description: "Full name of the customer" },
                { name: "issueSummary", description: "One-line summary of the reported problem" },
                { name: "affectedProduct", description: "Product or service that is broken" },
                { name: "urgency", description: "Urgency level detected in the message tone" },
              ],
              model: "gpt-4o",
              outputFormat: "json",
            },
            metadata: { componentId: "extraction-agent", isDemo: true },
          },
          {
            id: n3,
            nodeType: "CLASSIFICATION_AGENT",
            category: "AI_AGENT",
            label: "Classify Issue Type",
            description: "Route to Bug, Billing, Feature Request, or General Inquiry",
            position: { x: 300, y: 380 },
            config: {
              categories: ["bug", "billing", "feature-request", "general-inquiry"],
              confidenceThreshold: 0.75,
              model: "gpt-4o",
              systemPrompt:
                "You are a support ticket classifier. Classify the issue into exactly one category.",
            },
            metadata: { componentId: "classification-agent", isDemo: true },
          },
          {
            id: n4,
            nodeType: "REASONING_AGENT",
            category: "AI_AGENT",
            label: "Generate Reply Draft",
            description: "Draft a personalised first-response email",
            position: { x: 300, y: 540 },
            config: {
              model: "gpt-4o",
              temperature: 0.4,
              systemPrompt:
                "You are a friendly support agent. Write a concise, empathetic first-response email acknowledging the issue and stating next steps.",
              outputFormat: "markdown",
            },
            metadata: { componentId: "reasoning-agent", isDemo: true },
          },
          {
            id: n5,
            nodeType: "EMAIL_SEND",
            category: "ACTION",
            label: "Send to Customer",
            description: "Deliver the drafted reply to the customer",
            position: { x: 300, y: 700 },
            config: {
              to: "{{extract.customerEmail}}",
              subject: "Re: {{extract.subject}}",
              body: "{{reason.output}}",
              from: "support@autochain.ai",
              replyTo: "support@autochain.ai",
            },
            metadata: { componentId: "email-send", isDemo: true },
          },
        ],
      },
      edges: {
        create: [
          { sourceNodeId: n1, targetNodeId: n2, animated: true },
          { sourceNodeId: n2, targetNodeId: n3, animated: true },
          { sourceNodeId: n3, targetNodeId: n4, animated: true },
          { sourceNodeId: n4, targetNodeId: n5, animated: true },
        ],
      },
    },
  });

  return workflow;
}

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Sign Up
router.post("/signup", async (req, res) => {
  try {
    const body = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: await bcrypt.hash(body.password, 10),
      },
    });

    // Create default workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: `${body.name}'s Workspace`,
        slug: `${body.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        members: {
          create: {
            userId: user.id,
            role: "ADMIN",
          },
        },
      },
    });

    const token = generateToken(user.id);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
      workspace: { id: workspace.id, name: workspace.name },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Signup failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        workspaces: {
          include: { workspace: true },
          take: 1,
        },
      },
    });

    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      workspace: user.workspaces[0]?.workspace || null,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Login failed" });
  }
});

// Get current user
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        workspaces: {
          include: { workspace: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const userRouter = router;