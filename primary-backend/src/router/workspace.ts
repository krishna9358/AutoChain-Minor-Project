import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import { z } from "zod";

const router = Router();

// ─── Schemas with Type Inference ───────────────────────────────
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  slug: z.string().min(3).max(50).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  slug: z.string().min(3).max(50).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
});

// ─── Types inferred from Schemas ───────────────────────────────
type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
type AddMemberInput = z.infer<typeof addMemberSchema>;

// ─── Create Workspace ─────────────────────────────────────────
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const body = createWorkspaceSchema.parse(req.body) as CreateWorkspaceInput;

    // Generate slug if not provided
    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 50);

    // Check if slug is unique
    const existing = await prisma.workspace.findUnique({
      where: { slug },
    });

    if (existing) {
      return res.status(400).json({
        error: "Workspace with this slug already exists",
      });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        description: body.description,
        slug,
      },
    });

    // Add creator as ADMIN member
    await prisma.workspaceMember.create({
      data: {
        userId: req.userId!,
        workspaceId: workspace.id,
        role: "ADMIN",
      },
    });

    const fullWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        _count: {
          select: { workflows: true, members: true },
        },
      },
    });

    res.status(201).json(fullWorkspace);
  } catch (err: any) {
    console.error("Create workspace error:", err);
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── List User's Workspaces ──────────────────────────────────
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: { workflows: true, members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    res.json(workspaces);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Single Workspace ──────────────────────────────────
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Check if user is a member
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.userId!,
          workspaceId: req.params.id,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: { workflows: true, members: true },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json(workspace);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update Workspace ─────────────────────────────────────────
router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const body = updateWorkspaceSchema.parse(req.body) as UpdateWorkspaceInput;

    // Check if user is ADMIN or EDITOR
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.userId!,
          workspaceId: req.params.id,
        },
      },
    });

    if (
      !membership ||
      (membership.role !== "ADMIN" && membership.role !== "EDITOR")
    ) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        name: body.name,
        description: body.description,
        slug: body.slug,
        updatedAt: new Date(),
      },
    });

    res.json(workspace);
  } catch (err: any) {
    console.error("Update workspace error:", err);
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete Workspace ─────────────────────────────────────────
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Check if user is ADMIN
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.userId!,
          workspaceId: req.params.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can delete workspaces" });
    }

    await prisma.workspace.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete workspace error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Add Member to Workspace ───────────────────────────────
router.post("/:id/members", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const body = addMemberSchema.parse(req.body) as AddMemberInput;

    // Check if user is ADMIN
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.userId!,
          workspaceId: req.params.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can add members" });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: req.params.id,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: "User is already a member" });
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: req.params.id,
        role: body.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    res.status(201).json(newMember);
  } catch (err: any) {
    console.error("Add member error:", err);
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── Remove Member from Workspace ────────────────────────────
router.delete(
  "/:id/members/:userId",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      // Check if user is ADMIN
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.userId!,
            workspaceId: req.params.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        return res.status(403).json({
          error: "Only admins can remove members",
        });
      }

      await prisma.workspaceMember.delete({
        where: {
          userId_workspaceId: {
            userId: req.params.userId,
            workspaceId: req.params.id,
          },
        },
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Remove member error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

export const workspaceRouter = router;
