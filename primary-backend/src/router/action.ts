import { Router } from "express";
import prisma from "../db";

const router = Router();

// The old availableAction model no longer exists.
// This endpoint now returns workflow component catalog info instead.
router.get("/available", async (req, res) => {
    // Return tools as available actions
    const tools = await prisma.tool.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        category: true,
      },
    });
    res.json({
        availableActions: tools
    });
});

export const actionRouter = router;