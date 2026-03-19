import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware";
import { ZapCreateSchema } from "../types";
import prisma from "../db";

const router = Router();

// NOTE: The old Zap/Trigger/Action models no longer exist in the schema.
// This router is kept for backward compatibility but now creates Workflows instead.

router.post("/", authMiddleware, async (req: AuthRequest, res) => {
    const id: string = req.userId!;
    const body = req.body;
    const parsedData = ZapCreateSchema.safeParse(body);
    
    if (!parsedData.success) {
        return res.status(411).json({
            message: "Incorrect inputs"
        });
    }   

    // Get user's workspace
    const membership = await prisma.workspaceMember.findFirst({
        where: { userId: id },
    });

    if (!membership) {
        return res.status(400).json({ message: "No workspace found" });
    }

    const workflow = await prisma.workflow.create({
        data: {
            name: "Untitled Zap",
            userId: id,
            workspaceId: membership.workspaceId,
        },
        include: {
            nodes: true,
            edges: true,
        },
    });

    return res.json({
        zapId: workflow.id
    });
});

router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    const id = req.userId!;

    const membership = await prisma.workspaceMember.findFirst({
        where: { userId: id },
    });

    if (!membership) {
        return res.json({ zaps: [] });
    }

    const workflows = await prisma.workflow.findMany({
        where: {
            workspaceId: membership.workspaceId,
            userId: id,
        },
        include: {
            nodes: true,
            edges: true,
        },
    });

    return res.json({
        zaps: workflows
    });
});

router.get("/:zapId", authMiddleware, async (req: AuthRequest, res) => {
    const id = req.userId!;
    const zapId = req.params.zapId;

    const workflow = await prisma.workflow.findFirst({
        where: {
            id: zapId,
            userId: id,
        },
        include: {
            nodes: true,
            edges: true,
        },
    });

    return res.json({
        zap: workflow
    });
});

export const zapRouter = router;