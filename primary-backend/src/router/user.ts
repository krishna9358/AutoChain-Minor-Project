import { Router } from "express";
import prisma from "../db";
import jwt from "jsonwebtoken";
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
          email: "dev@agentflow.ai",
          name: "Dev User",
          password: "dev123",
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

    res.json({
      token: "dev-demo-token",
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      workspace: membership?.workspace || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
        password: body.password, // In production: hash with bcrypt
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

    if (!user || user.password !== body.password) {
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